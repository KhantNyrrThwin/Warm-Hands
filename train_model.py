"""Train 77-class landmark BiLSTM. Hold out one signer for evaluation."""
import argparse, json
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset
ROOT=Path(__file__).resolve().parent
class Net(nn.Module):
 def __init__(self,nfeat,nclass):
  super().__init__(); self.rnn=nn.LSTM(nfeat,128,batch_first=True,bidirectional=True); self.fc=nn.Sequential(nn.Dropout(.3),nn.Linear(256,nclass))
 def forward(self,x): return self.fc(self.rnn(x)[0].mean(1))
def main():
 p=argparse.ArgumentParser(); p.add_argument('--holdout',required=True,help='Signer code excluded from training, e.g. P3'); p.add_argument('--epochs',type=int,default=40); a=p.parse_args()
 report=json.loads((ROOT/'dataset_manifest.json').read_text(encoding='utf-8')); records=report['records']; classes=json.loads((ROOT/'msl_classes.json').read_text(encoding='utf-8'))
 if a.holdout not in report['signers']: raise SystemExit('Holdout signer absent from dataset')
 def load(r):
  x=np.load(ROOT/r['file'])['features']; idx=np.linspace(0,len(x)-1,60).astype(int); return x[idx]
 train=[r for r in records if r['signer']!=a.holdout]; test=[r for r in records if r['signer']==a.holdout]
 if not train or not test: raise SystemExit('Need both training signers and holdout signer data')
 if any(not any(r['label']==c for r in train) for c in classes): raise SystemExit('A class is missing from training signers; collect it from all participants')
 X=np.asarray([load(r) for r in train]); y=np.asarray([classes.index(r['label']) for r in train]); Xt=np.asarray([load(r) for r in test]); yt=np.asarray([classes.index(r['label']) for r in test])
 device='cuda' if torch.cuda.is_available() else 'cpu'; model=Net(X.shape[2],len(classes)).to(device); opt=torch.optim.AdamW(model.parameters(),lr=.001); loss_fn=nn.CrossEntropyLoss()
 dl=DataLoader(TensorDataset(torch.tensor(X,dtype=torch.float32),torch.tensor(y)),batch_size=32,shuffle=True)
 for ep in range(a.epochs):
  model.train()
  for bx,by in dl: bx,by=bx.to(device),by.to(device); opt.zero_grad(); loss_fn(model(bx),by).backward(); opt.step()
  if (ep+1)%5==0: print(f'Epoch {ep+1}/{a.epochs}')
 model.eval()
 with torch.no_grad(): pred=model(torch.tensor(Xt,dtype=torch.float32,device=device)).argmax(1).cpu().numpy()
 print(f'Holdout {a.holdout} accuracy: {(pred==yt).mean():.3f} ({len(test)} clips)')
 out=ROOT/'models'; out.mkdir(exist_ok=True); torch.save({'state_dict':model.cpu().state_dict(),'classes':classes,'feature_count':X.shape[2],'sequence_frames':60,'holdout_signer':a.holdout},out/'msl77_bilstm.pt'); print('Saved models/msl77_bilstm.pt')
if __name__=='__main__': main()
