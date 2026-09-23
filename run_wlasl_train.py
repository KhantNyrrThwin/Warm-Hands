"""Download hospital videos, extract landmarks, train the 100-class BiLSTM."""

from download_wlasl import download_all
from extract_landmarks import extract_all
from train import train


if __name__ == "__main__":
    download_all()
    extract_all()
    train()
