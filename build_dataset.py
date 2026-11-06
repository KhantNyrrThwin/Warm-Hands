"""Validate merged contributions and write a dataset inventory/quality report."""
import json
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parent
def main():
 classes=json.loads((ROOT/'msl_classes.json').read_text(encoding='utf-8')); root=ROOT/'contributions'; records=[]; errors=[]
 for f in sorted(root.glob('*/*/*.npz')):
  m=f.with_suffix('.json')
  try:
   meta=json.loads(m.read_text(encoding='utf-8')); x=np.load(f)['features']
   if meta['label'] not in classes: raise ValueError('unknown label')
   if x.ndim!=2 or not len(x): raise ValueError('invalid feature array')
   records.append({**meta,'file':f.relative_to(ROOT).as_posix(),'feature_shape':list(x.shape)})
  except Exception as e: errors.append({'file':str(f),'error':str(e)})
 counts={c:sum(r['label']==c for r in records) for c in classes}; signers=sorted({r['signer'] for r in records})
 report={'classes':len(classes),'clips':len(records),'signers':signers,'clips_per_class':counts,'minimum_per_class':min(counts.values()),'validation_errors':errors,'records':records}
 (ROOT/'dataset_manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f"{len(records)} valid clips; signers: {', '.join(signers)}; minimum/class: {min(counts.values())}; errors: {len(errors)}")
 for i,c in enumerate(classes): print(f'{i+1:02d} {c}: {counts[c]}')
 print('Saved dataset_manifest.json')
if __name__=='__main__': main()
