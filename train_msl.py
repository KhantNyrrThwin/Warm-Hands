"""Train the 20-sign Myanmar Sign Language LSTM from imported clips."""

from __future__ import annotations

from model import train


def train_msl():
    return train()


if __name__ == "__main__":
    train_msl()
