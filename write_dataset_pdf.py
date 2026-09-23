"""Write a formatted PDF describing the Myanmar Sign Language dataset."""

from collections import Counter
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from sign_app.msl_dataset import load_glosses, load_samples

MMR = Path(r"C:\Windows\Fonts\mmrtext.ttf")
pdfmetrics.registerFont(TTFont("MyanmarText", str(MMR)))

NAVY = HexColor("#1a1f2e")
MUTED = HexColor("#445")
LINE = HexColor("#c5cad3")
HEAD_BG = HexColor("#eef1f6")


def build() -> Path:
    out = Path(__file__).resolve().parent / "Dataset_Detailed.pdf"
    glosses = load_glosses()
    samples = load_samples()
    counts = Counter(
        row["gloss"] for row in samples if Path(row["landmark_path"]).exists()
    )
    n_clips = sum(counts.values())

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "DocTitle", parent=styles["Title"], fontName="Times-Bold",
        fontSize=18, leading=22, textColor=NAVY, spaceAfter=6,
    )
    subtitle = ParagraphStyle(
        "DocSub", parent=styles["Normal"], fontName="Times-Italic",
        fontSize=11, leading=14, textColor=MUTED, spaceAfter=16,
    )
    h = ParagraphStyle(
        "DocH", parent=styles["Heading2"], fontName="Times-Bold",
        fontSize=13, leading=16, textColor=NAVY, spaceBefore=14, spaceAfter=6,
    )
    body = ParagraphStyle(
        "DocBody", parent=styles["Normal"], fontName="Times-Roman",
        fontSize=11, leading=15, spaceAfter=8,
    )
    small = ParagraphStyle(
        "DocSmall", parent=body, fontSize=9, leading=12, spaceAfter=2,
    )
    cell = ParagraphStyle(
        "Cell", parent=body, fontSize=8.5, leading=11, spaceAfter=0,
    )
    cell_my = ParagraphStyle(
        "CellMy", parent=cell, fontName="MyanmarText", fontSize=9, leading=13,
    )
    bullet = ParagraphStyle("DocBullet", parent=body, leftIndent=18, spaceAfter=3)
    foot = ParagraphStyle(
        "Foot", parent=body, fontSize=9, textColor=HexColor("#666"),
    )

    def p(text, style=body):
        return Paragraph(text, style)

    def items(lines):
        return ListFlowable(
            [ListItem(Paragraph(line, bullet), leftIndent=12) for line in lines],
            bulletType="bullet",
            start="bulletchar",
            leftIndent=18,
            spaceAfter=8,
        )

    def table(header, rows, col_widths):
        head = [Paragraph(f"<b>{c}</b>", cell) for c in header]
        data = [head] + rows
        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), HEAD_BG),
                    ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
                    ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HexColor("#f7f8fb")]),
                ]
            )
        )
        return t

    vocab_rows = []
    for i, item in enumerate(glosses):
        vocab_rows.append(
            [
                Paragraph(str(i), cell),
                Paragraph(item["id"], cell),
                Paragraph(item["en"], cell),
                Paragraph(item["my"], cell_my),
                Paragraph(str(counts.get(item["id"], 0)), cell),
            ]
        )

    story = [
        p("Our Dataset: Myanmar Sign Language (MSL-20)", title),
        p(
            "Isolated-sign webcam dataset for the hospital / appointment vocabulary. "
            f"Currently {n_clips} clips across {len(glosses)} signs.",
            subtitle,
        ),
        p("Overview", h),
        p(
            "This is <b>our own dataset</b>, not WLASL. It is Myanmar Sign Language "
            "recorded on the same 5-second webcam protocol the detector uses at test time. "
            "The BiLSTM never sees raw pixels. It trains on MediaPipe skeleton landmarks."
        ),
        p(
            "The dataset is <b>not an Excel/CSV file</b>. It is JSON metadata plus one "
            "NumPy matrix per clip. Those JSON fields and landmark numbers are the columns."
        ),
        p("Where the files live", h),
        items(
            [
                "<font face='Courier'>data/msl20/glosses.json</font> &mdash; the 20-sign vocabulary",
                "<font face='Courier'>data/msl20/samples.json</font> &mdash; one row per recorded clip",
                "<font face='Courier'>data/msl20/landmarks/&lt;gloss&gt;/&lt;gloss&gt;_0001.npy</font> &mdash; skeleton features",
                "<font face='Courier'>data/msl20/videos/&lt;gloss&gt;/&lt;gloss&gt;_0001.mp4</font> &mdash; preview video for review only",
            ]
        ),
        p("1. Vocabulary table &mdash; glosses.json", h),
        p(
            "One row per sign. Edit this file before recording if you need different words. "
            "Keep <font face='Courier'>id</font> in English with no spaces (for example <font face='Courier'>thank_you</font>)."
        ),
        table(
            ["Column", "Type", "Meaning"],
            [
                [Paragraph(a, cell), Paragraph(b, cell), Paragraph(c, cell)]
                for a, b, c in [
                    ("id", "string", "Folder name and file label. ASCII, no spaces."),
                    ("en", "string", "English gloss shown in the UI."),
                    ("my", "string", "Myanmar (Burmese) gloss. This is the text the model should output."),
                ]
            ],
            [1.1 * inch, 0.9 * inch, 4.5 * inch],
        ),
        Spacer(1, 8),
        p("The 20 signs (class_id follows this order)", h),
        table(
            ["class_id", "id", "en", "my", "clips"],
            vocab_rows,
            [0.8 * inch, 1.15 * inch, 1.15 * inch, 2.3 * inch, 0.7 * inch],
        ),
        Spacer(1, 6),
        p(
            f"Total stored clips: <b>{n_clips}</b>. Training needs at least 8 clips per sign. "
            "About 30 per sign is the recording target.",
            small,
        ),
        p("2. Clip index &mdash; samples.json", h),
        p("One row per 5-second recording. These are the dataset columns for each example."),
        table(
            ["Column", "Type", "Meaning"],
            [
                [Paragraph(a, cell), Paragraph(b, cell), Paragraph(c, cell)]
                for a, b, c in [
                    ("gloss", "string", "Same as id in glosses.json (hello, doctor, …)."),
                    ("class_id", "int", "Integer label for training, 0–19."),
                    ("landmark_path", "string", "Path to the .npy skeleton file the model trains on."),
                    ("video_path", "string", "Path to a small preview .mp4 (human review, not used by the BiLSTM)."),
                    ("created", "string", "UTC timestamp when that clip was saved."),
                ]
            ],
            [1.35 * inch, 0.85 * inch, 4.3 * inch],
        ),
        Spacer(1, 8),
        p("Example row:", small),
        p(
            "<font face='Courier' size='8'>"
            "{ \"gloss\": \"hello\", \"class_id\": 0, "
            "\"landmark_path\": \"...\\\\hello_0001.npy\", "
            "\"video_path\": \"...\\\\hello_0001.mp4\", "
            "\"created\": \"2026-09-18T06:26:10+00:00\" }"
            "</font>",
            small,
        ),
        p("3. Landmark file &mdash; the real features (.npy)", h),
        p(
            "Each <font face='Courier'>.npy</font> file is a matrix of shape "
            "<b>(frames, 165)</b>, dtype float32. Rows are time (about 5 seconds of webcam frames). "
            "Columns are 165 landmark numbers per frame. They are not stored with names; the order is fixed."
        ),
        table(
            ["Index", "Count", "Content"],
            [
                [Paragraph(a, cell), Paragraph(b, cell), Paragraph(c, cell)]
                for a, b, c in [
                    ("0–62", "63", "Left hand — 21 joints × (x, y, z)"),
                    ("63–125", "63", "Right hand — 21 joints × (x, y, z)"),
                    ("126–164", "39", "Upper body — 13 joints × (x, y, z)"),
                ]
            ],
            [1.2 * inch, 0.8 * inch, 4.5 * inch],
        ),
        Spacer(1, 8),
        p(
            "Coordinates are <b>normalized</b>: origin = midpoint of the shoulders, "
            "scale = shoulder width. Missing hands are zeros."
        ),
        p("<b>Hand joints</b> (MediaPipe). Each has _x, _y, _z. Left hand uses indices 0–62; right hand repeats the same names at 63–125.", small),
        table(
            ["Joint", "Name"],
            [
                [Paragraph(a, cell), Paragraph(b, cell)]
                for a, b in [
                    ("0", "wrist"),
                    ("1–4", "thumb_cmc, thumb_mcp, thumb_ip, thumb_tip"),
                    ("5–8", "index_mcp, index_pip, index_dip, index_tip"),
                    ("9–12", "middle_mcp, middle_pip, middle_dip, middle_tip"),
                    ("13–16", "ring_mcp, ring_pip, ring_dip, ring_tip"),
                    ("17–20", "pinky_mcp, pinky_pip, pinky_dip, pinky_tip"),
                ]
            ],
            [1.1 * inch, 5.4 * inch],
        ),
        Spacer(1, 8),
        p(
            "So column 0 is <font face='Courier'>left_wrist_x</font>, column 1 is "
            "<font face='Courier'>left_wrist_y</font>, column 2 is "
            "<font face='Courier'>left_wrist_z</font>, column 63 is "
            "<font face='Courier'>right_wrist_x</font>."
        ),
        p(
            "<b>Body joints</b> (columns 126–164): nose, left_eye, right_eye, left_ear, "
            "right_ear, left_shoulder, right_shoulder, left_elbow, right_elbow, "
            "left_wrist, right_wrist, left_hip, right_hip — each with x, y, z."
        ),
        p("4. What the model sees after processing", h),
        p("Training does not feed the raw (frames × 165) file as-is."),
        items(
            [
                "Resample the clip to <b>64 frames</b>",
                "Append <b>velocity</b> (this frame minus the previous frame)",
            ]
        ),
        table(
            ["Item", "Shape", "Meaning"],
            [
                [Paragraph(a, cell), Paragraph(b, cell), Paragraph(c, cell)]
                for a, b, c in [
                    ("X", "(64, 330)", "165 positions + 165 velocities"),
                    ("y", "1 integer", "class_id (0–19)"),
                ]
            ],
            [1.1 * inch, 1.4 * inch, 4.0 * inch],
        ),
        Spacer(1, 8),
        p("Columns 0–164 = positions. Columns 165–329 = the same joints’ speeds."),
        p("How the dataset is created and used", h),
        items(
            [
                "<b>Define vocabulary</b> in glosses.json (20 signs: id, en, my).",
                "<b>Record</b> with <font face='Courier'>python record_msl.py</font>: pick a sign, record 5 seconds, hands in view. Target about 30 clips per sign (minimum 8 to train).",
                "<b>Store</b> skeleton .npy + preview video + one samples.json row (gloss, class_id, paths, created).",
                "<b>Train</b> with <font face='Courier'>python train_msl.py</font>: load every .npy, resample, add velocity, train the 2-layer BiLSTM. The printed class name is Myanmar text with English in parentheses.",
                "<b>Detect</b> with <font face='Courier'>python app.py</font>. If <font face='Courier'>models/msl20_bilstm.npz</font> exists, the app uses this 20-sign dataset instead of WLASL.",
            ]
        ),
        p(
            "You do not type column names into a spreadsheet. The columns are those JSON fields "
            "plus the 165 (then 330) landmark numbers in each .npy file."
        ),
        Spacer(1, 0.12 * inch),
        p(
            "Source files: <font face='Courier'>data/msl20/</font>, "
            "<font face='Courier'>sign_app/msl_dataset.py</font>, "
            "<font face='Courier'>sign_app/features.py</font>.",
            foot,
        ),
    ]

    doc = SimpleDocTemplate(
        str(out),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="Our Dataset: Myanmar Sign Language (MSL-20)",
        author="WH Sign Language Project",
    )
    doc.build(story)
    return out


if __name__ == "__main__":
    print(build())
