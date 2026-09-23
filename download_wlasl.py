from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from sign_app.dataset import build_samples
from sign_app.paths import HF_INDEX_PATH, VIDEO_DIR
from sign_app.setup_assets import extract_glosses

HF_API = "https://huggingface.co/api/datasets/Voxel51/WLASL/tree/main"
HF_RESOLVE = "https://huggingface.co/datasets/Voxel51/WLASL/resolve/main"
UA = {"User-Agent": "wlasl-trainer/1.0"}


def _get_json(url: str):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def list_hf_videos(force: bool = False) -> dict[str, str]:
    if HF_INDEX_PATH.exists() and not force:
        return json.loads(HF_INDEX_PATH.read_text(encoding="utf-8"))
    print("Fetching Hugging Face file list...", flush=True)
    from huggingface_hub import HfApi

    files = HfApi().list_repo_files("Voxel51/WLASL", repo_type="dataset")
    mapping = {
        Path(path).stem: path
        for path in files
        if path.endswith(".mp4")
    }
    HF_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    HF_INDEX_PATH.write_text(json.dumps(mapping), encoding="utf-8")
    return mapping


def _download_file(url: str, dest: Path, attempts: int = 4) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 8_000:
        return True
    tmp = dest.with_suffix(".part")
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = resp.read()
            if len(data) < 8_000 or data[:3] == b"<ht" or data[:9] == b"<!DOCTYPE":
                time.sleep(1.5 * (attempt + 1))
                continue
            tmp.write_bytes(data)
            tmp.replace(dest)
            return True
        except urllib.error.HTTPError as exc:
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            wait = 8.0 if exc.code in (429, 503) else 1.5 * (attempt + 1)
            time.sleep(wait)
        except (urllib.error.URLError, TimeoutError, OSError):
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            time.sleep(1.5 * (attempt + 1))
    return False


def download_one(video_id: str, hf_path: str | None, fallback_url: str) -> str:
    dest = VIDEO_DIR / f"{video_id}.mp4"
    if dest.exists() and dest.stat().st_size > 8_000:
        return "exists"
    if hf_path:
        ok = _download_file(f"{HF_RESOLVE}/{hf_path}", dest)
        if ok:
            return "hf"
    if fallback_url and "youtu" not in fallback_url:
        ok = _download_file(fallback_url, dest)
        if ok:
            return "url"
    return "fail"


def download_all(workers: int = 8, include_original_urls: bool = True) -> None:
    extract_glosses()
    samples = build_samples()
    print("Listing Hugging Face WLASL videos...", flush=True)
    hf = list_hf_videos()
    print(f"HF videos: {len(hf)}  JSON instances: {len(samples)}", flush=True)
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)

    hf_classes = set()
    missing_class_jobs = []
    jobs = []
    seen = set()
    for sample in samples:
        vid = sample["video_id"]
        if vid in hf and vid not in seen:
            jobs.append((vid, hf[vid], ""))
            seen.add(vid)
            hf_classes.add(sample["class_id"])
    for sample in samples:
        if sample["class_id"] in hf_classes:
            continue
        vid = sample["video_id"]
        if vid in seen:
            continue
        seen.add(vid)
        url = sample["url"] if include_original_urls else ""
        missing_class_jobs.append((vid, None, url))
    jobs.extend(missing_class_jobs)
    jobs = [
        job
        for job in jobs
        if not ((VIDEO_DIR / f"{job[0]}.mp4").exists() and (VIDEO_DIR / f"{job[0]}.mp4").stat().st_size > 8_000)
    ]
    print(
        f"Queued {len(jobs)} remaining downloads "
        f"({len(missing_class_jobs)} extra for classes missing on HF)",
        flush=True,
    )

    stats = {"exists": 0, "hf": 0, "url": 0, "fail": 0}
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(download_one, vid, path, url): vid for vid, path, url in jobs
        }
        for fut in as_completed(futures):
            status = fut.result()
            stats[status] += 1
            done += 1
            if done % 100 == 0 or done == len(futures):
                print(
                    f"download {done}/{len(futures)} {stats}",
                    flush=True,
                )
    print("Download finished", stats, flush=True)


if __name__ == "__main__":
    download_all()
