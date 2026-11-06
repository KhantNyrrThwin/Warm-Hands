"""Record labeled MSL landmark sequences. Run: python collect_data.py --signer P1"""
import argparse, json, time, uuid
from datetime import datetime, timezone
from pathlib import Path
import cv2, numpy as np
from sign_app.landmarks import LandmarkTracker, HAND_CONNECTIONS, POSE_CONNECTIONS

ROOT=Path(__file__).resolve().parent
def main():
    p=argparse.ArgumentParser(); p.add_argument('--signer',required=True,help='Unique participant code, e.g. P1'); p.add_argument('--camera',type=int,default=0); p.add_argument('--out',default='contributions'); a=p.parse_args()
    classes=json.loads((ROOT/'msl_classes.json').read_text(encoding='utf-8')); cap=cv2.VideoCapture(a.camera)
    if not cap.isOpened(): raise SystemExit('Cannot open camera')
    tracker=LandmarkTracker(); print('Class 1/77 starts. N=record, Q=quit; show face, torso and both hands.')
    try:
      for ci,label in enumerate(classes):
        print(f'\n{ci+1}/77 {label} — N records one 3-second example; press N again for more; Q quits')
        while True:
          ok,frame=cap.read()
          if not ok: break
          frame=cv2.flip(frame,1); rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB); track=tracker.process(rgb)
          # draw pose and hands from tracked landmarks for visible collection feedback
          for points,edges,color in [(track.pose,POSE_CONNECTIONS,(0,180,255)),(track.left_hand,HAND_CONNECTIONS,(0,255,0)),(track.right_hand,HAND_CONNECTIONS,(255,120,0))]:
            for lm in points: cv2.circle(frame,(int(lm.x*frame.shape[1]),int(lm.y*frame.shape[0])),4,color,-1)
          cv2.putText(frame,f'{ci+1}/77 {label} | N record | Q quit',(12,30),cv2.FONT_HERSHEY_SIMPLEX,.7,(255,255,255),2); cv2.imshow('MSL landmark collector',frame)
          key=cv2.waitKey(1)&255
          if key in (ord('q'),27): return
          if key==ord('n'):
            seq=[track.features]; end=time.time()+3
            while time.time()<end:
              ok,f=cap.read()
              if not ok: break
              f=cv2.flip(f,1); tr=tracker.process(cv2.cvtColor(f,cv2.COLOR_BGR2RGB)); seq.append(tr.features)
              for pts,edges,col in [(tr.pose,POSE_CONNECTIONS,(0,180,255)),(tr.left_hand,HAND_CONNECTIONS,(0,255,0)),(tr.right_hand,HAND_CONNECTIONS,(255,120,0))]:
                for lm in pts: cv2.circle(f,(int(lm.x*f.shape[1]),int(lm.y*f.shape[0])),4,col,-1)
              cv2.putText(f,f'Recording {label}',(12,30),cv2.FONT_HERSHEY_SIMPLEX,.8,(0,0,255),2); cv2.imshow('MSL landmark collector',f); cv2.waitKey(1)
            folder=ROOT/a.out/a.signer/f'{ci+1:02d}'; folder.mkdir(parents=True,exist_ok=True); sid=uuid.uuid4().hex
            np.savez_compressed(folder/f'{sid}.npz',features=np.asarray(seq,dtype=np.float32))
            meta={'id':sid,'label':label,'class_index':ci,'signer':a.signer,'captured_utc':datetime.now(timezone.utc).isoformat(),'frames':len(seq),'fps_target':30,'feature_version':'sign_app.features.frame_features'}
            (folder/f'{sid}.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8'); print('Saved',len(seq),'frames')
    finally: cap.release(); tracker.close(); cv2.destroyAllWindows()
if __name__=='__main__': main()
