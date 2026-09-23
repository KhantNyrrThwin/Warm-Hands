"""Write a formatted PDF of the detailed model-layer explanation."""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer


def build() -> Path:
    out = Path(__file__).resolve().parent / "Model_Layers_Detailed.pdf"
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontName="Times-Bold",
        fontSize=18,
        leading=22,
        textColor=HexColor("#1a1f2e"),
        spaceAfter=6,
    )
    subtitle = ParagraphStyle(
        "DocSub",
        parent=styles["Normal"],
        fontName="Times-Italic",
        fontSize=11,
        leading=14,
        textColor=HexColor("#445"),
        spaceAfter=16,
    )
    h = ParagraphStyle(
        "DocH",
        parent=styles["Heading2"],
        fontName="Times-Bold",
        fontSize=13,
        leading=16,
        textColor=HexColor("#1a1f2e"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=11,
        leading=15,
        spaceAfter=8,
    )
    bullet = ParagraphStyle(
        "DocBullet",
        parent=body,
        leftIndent=18,
        spaceAfter=3,
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

    story = [
        p("Detailed Explanation of the Model Layers", title),
        p("Hospital / Myanmar Sign Language isolated-sign detector", subtitle),
        p(
            "The live model is a <b>2-layer Bidirectional LSTM</b>, then a small "
            "<b>dense classifier</b>. It is not a CNN and not a Transformer. "
            "One clip in, one word out."
        ),
        p(
            "That matches the 5-second app flow: the whole sign is already recorded, "
            "so the network can look <b>forward and backward</b> in time."
        ),
        p("Pipeline", h),
        items(
            [
                "5-second landmarks (variable frames &times; 165)",
                "Resample to 64 frames",
                "Add velocity &rarr; 64 &times; 330",
                "BiLSTM layer 1: 128 forward + 128 backward",
                "Dropout 0.35 (training only, between LSTM layers)",
                "BiLSTM layer 2: 128 forward + 128 backward",
                "Concat last hidden states (256)",
                "Dense 128 + ReLU, then Dropout 0.35",
                "Dense K + Softmax (K = 100 for WLASL hospital, K = 20 for Myanmar signs)",
            ]
        ),
        p("What goes into the first layer", h),
        p(
            "MediaPipe turns each video frame into <b>165 numbers</b>:"
        ),
        items(
            [
                "Left hand: 21 joints &times; (x, y, z) = 63",
                "Right hand: 21 &times; 3 = 63",
                "Upper body: 13 joints &times; 3 = 39 (nose, eyes, ears, shoulders, elbows, wrists, hips)",
            ]
        ),
        p(
            "Those coordinates are centered on the shoulders so body size and camera "
            "distance matter less. A 5-second clip has many frames. They are "
            "<b>resampled to 64 frames</b>, then <b>velocity</b> is stacked on "
            "(this frame minus the previous frame). The network therefore sees "
            "shape <b>(64, 330)</b>: time steps T = 64, features F = 330 "
            "(165 positions + 165 speeds). That tensor is the input <i>x</i> of HospitalBiLSTM."
        ),
        p("Layer 1 &mdash; Bidirectional LSTM (128 + 128)", h),
        p(
            "This is a <b>recurrent</b> layer: it reads the 64 frames one after another "
            "and keeps a memory of the sign so far. <b>Bidirectional</b> means two LSTMs "
            "run in parallel on the same clip:"
        ),
        items(
            [
                "<b>Forward LSTM:</b> frame 1 &rarr; 64 (how the sign starts and unfolds)",
                "<b>Backward LSTM:</b> frame 64 &rarr; 1 (how the sign ends, which often defines the gloss)",
            ]
        ),
        p(
            "Each direction has a <b>128-dimensional hidden state</b>. At every frame they "
            "are concatenated, so layer 1 outputs <b>256 numbers per frame</b>."
        ),
        p(
            "Inside each LSTM cell there are <b>four gates</b>, not one simple neuron:"
        ),
        items(
            [
                "<b>Input gate i</b> &mdash; how much of this frame to write into memory",
                "<b>Forget gate f</b> &mdash; how much old motion to drop (pause vs. a new handshape)",
                "<b>Cell candidate g</b> &mdash; the new content from the current frame and previous hidden state",
                "<b>Output gate o</b> &mdash; how much of the memory to expose as the hidden state",
            ]
        ),
        p(
            "The cell state <i>c</i> is long-term memory of the whole gesture. "
            "The hidden state <i>h</i> is what the next layer sees at this frame. "
            "Each timestep, forgotten old memory is mixed with newly written content; "
            "the hidden state is a gated view of that cell."
        ),
        p("Dropout between the two LSTM layers (0.35)", h),
        p(
            "Because there are two LSTM layers, <b>dropout 0.35</b> is applied on the "
            "connection from layer 1 to layer 2 during training. It randomly zeros 35% "
            "of those 256 values so the net cannot memorize one signer&rsquo;s exact speed. "
            "At test time dropout is off."
        ),
        p("Layer 2 &mdash; Bidirectional LSTM (128 + 128)", h),
        p(
            "Same idea as layer 1, but its input is already <b>motion patterns</b>, not raw joints. "
            "Layer 1 is closer to &ldquo;hand moved up, then the wrist rotated.&rdquo; "
            "Layer 2 is closer to &ldquo;that sequence looks like thank you, not hello.&rdquo;"
        ),
        p(
            "It is also bidirectional, hidden size 128 each way. After layer 2 we "
            "<b>do not keep all 64 frames</b>. We take only:"
        ),
        items(
            [
                "The <b>last forward</b> hidden state (summary after seeing the whole clip left to right)",
                "The <b>last backward</b> hidden state (summary after seeing the whole clip right to left)",
            ]
        ),
        p(
            "Those two 128-vectors are concatenated &rarr; <b>256 numbers for the whole sign</b>. "
            "That is why this is isolated-sign recognition, not streaming: we wait until the "
            "5 seconds are finished, then read both directions."
        ),
        p("Dense hidden layer (128, ReLU)", h),
        p(
            "A fully connected layer maps 256 features to 128. Every one of the 256 BiLSTM "
            "features can affect every one of the 128 outputs. <b>ReLU</b> turns negative "
            "values to 0 so the next layer can form sharper &ldquo;sign A vs sign B&rdquo; "
            "boundaries. Dropout 0.35 is applied again during training."
        ),
        p("Output layer (K classes, softmax)", h),
        p(
            "A fully connected layer maps 128 features to <b>K scores</b> (logits), one per sign. "
            "The WLASL hospital model uses <b>K = 100</b>. After training on Myanmar recordings, "
            "<b>K = 20</b>. <b>Softmax</b> turns those scores into probabilities that sum to 1. "
            "The predicted text is the class with the highest probability."
        ),
        p("Implementation note", h),
        p(
            "Training uses PyTorch (<i>HospitalBiLSTM</i>: LSTM with input size 330, hidden 128, "
            "two layers, bidirectional, dropout 0.35; then Linear 256&rarr;128, ReLU, Dropout, "
            "Linear 128&rarr;K). The Qt webcam app runs the <b>same weights in NumPy</b> so "
            "PyQt5 and Torch do not conflict on Windows. The layers above are identical in both."
        ),
        p("What this model is not using", h),
        items(
            [
                "<b>Unidirectional LSTM</b> &mdash; the old network. Fine for live streaming; weaker for a finished 5-second clip.",
                "<b>CNN on pixels</b> &mdash; we classify skeleton landmarks, not raw video.",
                "<b>Transformer / attention</b> &mdash; possible later; BiLSTM is the current stack.",
                "<b>CTC</b> &mdash; for full sentences over time. This project classifies one isolated sign.",
            ]
        ),
        Spacer(1, 0.15 * inch),
        p(
            "Source: project architecture in <font face='Courier'>sign_app/lstm_net.py</font> "
            "(HospitalBiLSTM).",
            ParagraphStyle("Foot", parent=body, fontSize=9, textColor=HexColor("#666")),
        ),
    ]

    doc = SimpleDocTemplate(
        str(out),
        pagesize=letter,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title="Detailed Explanation of the Model Layers",
        author="WH Sign Language Project",
    )
    doc.build(story)
    return out


if __name__ == "__main__":
    print(build())
