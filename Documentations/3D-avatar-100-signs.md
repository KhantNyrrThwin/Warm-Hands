# 3D avatar — 100 signs, three animators

This is the working list for people who have not authored a clip before. Read this file first. You do **not** need to edit the 3D model (`.glb`). You write one TypeScript file per sign.

## How we tell files apart

**Yes: 100 signs → 100 files.** One clip file per sign.

| Rule | Why |
|---|---|
| File name = **sign id** (English snake_case) | `fever.ts` is always fever. Never `aung_fever.ts`. |
| Sign id never changes after you start | Renaming splits one sign into two, same as the recording data. |
| Animator name goes in a **comment at the top**, not in the file name | If someone else later polishes the clip, the file stays put. |
| Each person only creates **their assigned files** | Git merges stay small. |

Do **not** put three people’s work in one giant file (`demoSigns.ts` already became hard to share). Existing clips (`mingalarbar.ts`, `i.ts`, `sick.ts`, `headache.ts`, `signs.ts`, `demoSigns.ts`) stay as they are until someone is assigned to move them.

```
src/animation/clips/
  _template.ts          ← copy this, never commit your work into it
  fever.ts              ← one sign
  cough.ts
  ...
```

Fill in names once, then use them in every file header:

| Slot | Person’s name | GitHub / git user |
|---|---|---|
| Animator 1 | | |
| Animator 2 | | |
| Animator 3 | | |

---

## Files you create vs files you only edit

### Create (your assigned signs only)

Copy:

`src/animation/clips/_template.ts`

to:

`src/animation/clips/<sign_id>.ts`

Example: Animator 1 making “fever” creates **only** `src/animation/clips/fever.ts`.

### Edit (three shared files — add **one line each**, do not rewrite)

After the clip plays in preview, register it so the app can find it.

1. `src/animation/signs.ts`
   - import your `create…Animation` and `…_DURATION`
   - add the id to `ANIMATED_SIGN_IDS`
   - add the factory inside `createSignLibrary`
   - add the duration inside `SIGN_DURATIONS`
2. `src/animation/greetingInput.ts`
   - add Myanmar + English words in `SIGN_TEXT`
   - add a `GLOSSES` row if the word is new
3. `src/api/translation.ts`
   - add the Myanmar label in `SIGN_LABELS`

If two people edit those three files on the same day, pull before you push. The clip files themselves should not conflict.

### Do not create or edit (unless you are assigned that sign)

| File | Role |
|---|---|
| `public/models/WarmHands_Character.glb` | The character. Shared by every clip. |
| `src/animation/armPlayback.ts` | Arm solver. Shared. |
| `src/animation/handArticulation.ts` | Finger shapes. Shared. Use `HAND_SHAPES` from here. |
| `src/components/CharacterViewer.tsx` | Viewer. Shared. |
| `msl77_signs.py` | Official sign **ids**. Do not rename ids. |
| `src/animation/clips/_template.ts` | Template only. |

---

## Step-by-step (new animator)

1. `git pull`
2. Copy `_template.ts` → `src/animation/clips/<sign_id>.ts`
3. At the top, write your name and the Myanmar / English gloss from the table below.
4. Rename `PLACEHOLDER_DURATION` and `createPlaceholderAnimation` to match the id, for example `FEVER_DURATION` and `createFeverAnimation`.
5. Keep the first and last poses at rest (`REST_LEFT` / `REST_RIGHT`). Put the real signing poses in between.
6. Register the four places listed above.
7. Run the app and open the preview URL (see below).
8. Commit **your clip file** plus the small registry edits.

```sh
bun install
bun run dev
```

Preview one sign (replace `fever` with your id):

```
http://localhost:5173/?preview=fever
```

Freeze a moment to check a pose:

```
http://localhost:5173/?preview=fever&t=1.2
```

Several moments of the same clip:

```
http://localhost:5173/?preview=fever&times=.5,1.2,2.0
```

A sentence of several clips:

```
http://localhost:5173/?preview=i,fever,medicine&seq
```

---

## How to fill a pose (short)

Each keyframe is: **time in seconds**, **left arm**, **right arm**.

```ts
{ time: 0.8, left: REST_LEFT, right: raised }
```

Each arm has:

| Field | Meaning (model space) |
|---|---|
| `wrist` | `[x, y, z]` — `+y` up, `+z` toward the camera, `+x` toward the character’s left (viewer’s right) |
| `direction` | Where the fingers point |
| `palm` | Back-of-hand normal in older clips; follow `_template.ts` / `HAND_SHAPES` |
| `handShape` | `HAND_SHAPES.open`, `.fist`, `.point`, `.thumbsUp`, or a custom curl |
| `elbow` | Optional pole so the elbow bends the natural way |

Hands at rest between signs:

- `REST_RIGHT` / `REST_LEFT` from `armPlayback.ts`

Copy an existing simple clip if you get stuck: `src/animation/i.ts` (one hand to the chest).

Have a fluent MSL signer check handshape and timing before calling a clip done.

---

## Already in the app (do not redo unless assigned to polish)

These ids already play. Leave them unless the table says you own a polish pass.

| Sign id in app | Myanmar | Source file today |
|---|---|---|
| `hello` | မင်္ဂလာပါ | `src/animation/mingalarbar.ts` (dataset id is `mingalarbar`) |
| `i` | ကျွန်တော် | `src/animation/i.ts` |
| `sick` | နေမကောင်း | `src/animation/sick.ts` |
| `headache` | ခေါင်းကိုက် | `src/animation/headache.ts` |
| `thank_you` | ကျေးဇူးတင်ပါတယ် | `src/animation/signs.ts` |
| `please` | ကျေးဇူးပြု | `src/animation/signs.ts` |
| `help` | ကူညီ | `src/animation/signs.ts` |
| `medicine` | ဆေး | `src/animation/demoSigns.ts` |
| `how` | ဘယ်လို | `src/animation/demoSigns.ts` |
| `drink` | သောက် | `src/animation/demoSigns.ts` |
| `eat` | စား | `src/animation/demoSigns.ts` |
| `finished` | ပြီး | `src/animation/demoSigns.ts` |
| `five` | ၅ | `src/animation/demoSigns.ts` (same meaning as `num_5`) |
| `minute` | မိနစ် | `src/animation/demoSigns.ts` |
| `stomach_ache` | အစာအိမ်နာ | `src/animation/demoSigns.ts` |
| `what_happened` | ဘာဖြစ်လို့လဲ | `src/animation/demoSigns.ts` |

New files still use the **dataset id** from the tables (`mingalarbar`, `num_5`, …). When you register, you may map a dataset id to an existing app id (`hello`) — ask before changing that mapping.

---

## Assignment — 100 signs

**Animator 1** = signs 1–34  
**Animator 2** = signs 35–67  
**Animator 3** = signs 68–100  

Status: empty = not started. Write `done` or `polish` in your own copy if you track it in git.

### Animator 1 — create `src/animation/clips/<id>.ts`

| # | File to create | Sign id | Myanmar | English | Category | Notes |
|---|---|---|---|---|---|---|
| 1 | `src/animation/clips/i.ts` | `i` | ကျွန်တော် | I / me | greeting | Exists as `src/animation/i.ts` — polish only if assigned |
| 2 | `src/animation/clips/mingalarbar.ts` | `mingalarbar` | မင်္ဂလာပါ | Hello | greeting | Exists as `mingalarbar.ts` / app id `hello` |
| 3 | `src/animation/clips/fine.ts` | `fine` | ကောင်းပါတယ် | Fine / good | greeting | |
| 4 | `src/animation/clips/not_very_well.ts` | `not_very_well` | သိပ်မကောင်းဘူး | Not very well | greeting | |
| 5 | `src/animation/clips/not_good.ts` | `not_good` | မကောင်းဘူး | Not good | greeting | |
| 6 | `src/animation/clips/age.ts` | `age` | အသက် | Age | question | |
| 7 | `src/animation/clips/how_much.ts` | `how_much` | ဘယ်လောက် | How much | question | |
| 8 | `src/animation/clips/num_0.ts` | `num_0` | 0 | Zero | number | |
| 9 | `src/animation/clips/num_1.ts` | `num_1` | 1 | One | number | |
| 10 | `src/animation/clips/num_2.ts` | `num_2` | 2 | Two | number | |
| 11 | `src/animation/clips/num_3.ts` | `num_3` | 3 | Three | number | |
| 12 | `src/animation/clips/num_4.ts` | `num_4` | 4 | Four | number | |
| 13 | `src/animation/clips/num_5.ts` | `num_5` | 5 | Five | number | App already has `five` in `demoSigns.ts` |
| 14 | `src/animation/clips/num_6.ts` | `num_6` | 6 | Six | number | |
| 15 | `src/animation/clips/num_7.ts` | `num_7` | 7 | Seven | number | |
| 16 | `src/animation/clips/num_8.ts` | `num_8` | 8 | Eight | number | |
| 17 | `src/animation/clips/num_9.ts` | `num_9` | 9 | Nine | number | |
| 18 | `src/animation/clips/num_10.ts` | `num_10` | 10 | Ten | number | |
| 19 | `src/animation/clips/kachin.ts` | `kachin` | ကချင် | Kachin | region | |
| 20 | `src/animation/clips/kayah.ts` | `kayah` | ကယား | Kayah | region | |
| 21 | `src/animation/clips/kayin.ts` | `kayin` | ကရင် | Kayin | region | |
| 22 | `src/animation/clips/chin.ts` | `chin` | ချင်း | Chin | region | |
| 23 | `src/animation/clips/mon.ts` | `mon` | မွန် | Mon | region | |
| 24 | `src/animation/clips/rakhine.ts` | `rakhine` | ရခိုင် | Rakhine | region | |
| 25 | `src/animation/clips/shan.ts` | `shan` | ရှမ်း | Shan | region | |
| 26 | `src/animation/clips/sagaing.ts` | `sagaing` | စစ်ကိုင်း | Sagaing | region | |
| 27 | `src/animation/clips/mandalay.ts` | `mandalay` | မန္တလေး | Mandalay | region | |
| 28 | `src/animation/clips/magway.ts` | `magway` | မကွေး | Magway | region | |
| 29 | `src/animation/clips/bago.ts` | `bago` | ပဲခူး | Bago | region | |
| 30 | `src/animation/clips/yangon.ts` | `yangon` | ရန်ကုန် | Yangon | region | |
| 31 | `src/animation/clips/ayeyarwady.ts` | `ayeyarwady` | ဧရာဝတီ | Ayeyarwady | region | |
| 32 | `src/animation/clips/tanintharyi.ts` | `tanintharyi` | တနင်္သာရီ | Tanintharyi | region | |
| 33 | `src/animation/clips/naypyidaw.ts` | `naypyidaw` | နေပြည်တော် | Nay Pyi Taw | region | |
| 34 | `src/animation/clips/finished.ts` | `finished` | ပြီး | Finished | time | Exists in `demoSigns.ts` |

### Animator 2 — create `src/animation/clips/<id>.ts`

| # | File to create | Sign id | Myanmar | English | Category | Notes |
|---|---|---|---|---|---|---|
| 35 | `src/animation/clips/not_finished_yet.ts` | `not_finished_yet` | မပြီးသေးဘူး | Not finished yet | time | |
| 36 | `src/animation/clips/doctor.ts` | `doctor` | ဆရာဝန် | Doctor | people | |
| 37 | `src/animation/clips/nurse.ts` | `nurse` | သူနာပြု | Nurse | people | |
| 38 | `src/animation/clips/meet.ts` | `meet` | တွေ့ | Meet / see | action | |
| 39 | `src/animation/clips/go.ts` | `go` | သွား | Go | action | |
| 40 | `src/animation/clips/father.ts` | `father` | အဖေ | Father | family | |
| 41 | `src/animation/clips/mother.ts` | `mother` | အမေ | Mother | family | |
| 42 | `src/animation/clips/older_sister.ts` | `older_sister` | အစ်မ | Older sister | family | |
| 43 | `src/animation/clips/younger_brother.ts` | `younger_brother` | ညီ | Younger brother | family | |
| 44 | `src/animation/clips/older_brother.ts` | `older_brother` | အစ်ကို | Older brother | family | |
| 45 | `src/animation/clips/tomorrow.ts` | `tomorrow` | မနက်ဖြန် | Tomorrow | time | |
| 46 | `src/animation/clips/day_after_tomorrow.ts` | `day_after_tomorrow` | သန်ဘက်ခါ | Day after tomorrow | time | |
| 47 | `src/animation/clips/hour.ts` | `hour` | နာရီ | Hour / clock | time | |
| 48 | `src/animation/clips/time.ts` | `time` | အချိန် | Time | time | |
| 49 | `src/animation/clips/ministry_of_health.ts` | `ministry_of_health` | ကျန်းမာရေးဝန်ကြီးဌာန | Ministry of Health | health | |
| 50 | `src/animation/clips/severe.ts` | `severe` | အပြင်းအထန် | Severe | health | |
| 51 | `src/animation/clips/el_nino.ts` | `el_nino` | အယ်လ်နီညို | El Nino | other | |
| 52 | `src/animation/clips/hundred.ts` | `hundred` | ဟန်းဒရက် | Hundred | number | |
| 53 | `src/animation/clips/pound.ts` | `pound` | ပေါင် | Pound (weight) | measure | |
| 54 | `src/animation/clips/stomach_ache.ts` | `stomach_ache` | အစာအိမ်နာ | Stomach ache | symptom | Exists in `demoSigns.ts` |
| 55 | `src/animation/clips/toothache.ts` | `toothache` | သွားကိုက် | Toothache | symptom | |
| 56 | `src/animation/clips/fever.ts` | `fever` | အဖျား | Fever | symptom | |
| 57 | `src/animation/clips/cough.ts` | `cough` | ချောင်းဆိုး | Cough | symptom | |
| 58 | `src/animation/clips/medicine.ts` | `medicine` | ဆေး | Medicine | health | Exists in `demoSigns.ts` |
| 59 | `src/animation/clips/allergic.ts` | `allergic` | မတည့် | Allergic | health | |
| 60 | `src/animation/clips/have.ts` | `have` | ရှိတယ် | Have | answer | |
| 61 | `src/animation/clips/dont_have.ts` | `dont_have` | မရှိပါ | Don't have | answer | |
| 62 | `src/animation/clips/drink.ts` | `drink` | သောက် | Drink | action | Exists in `demoSigns.ts` |
| 63 | `src/animation/clips/eat.ts` | `eat` | စား | Eat | action | Exists in `demoSigns.ts` |
| 64 | `src/animation/clips/minute.ts` | `minute` | မိနစ် | Minute | time | Exists in `demoSigns.ts` |
| 65 | `src/animation/clips/avoid.ts` | `avoid` | ရှောင် | Avoid | action | |
| 66 | `src/animation/clips/disease.ts` | `disease` | ရောဂါ | Disease | health | |
| 67 | `src/animation/clips/lung.ts` | `lung` | အဆုတ် | Lung | body | |

### Animator 3 — create `src/animation/clips/<id>.ts`

| # | File to create | Sign id | Myanmar | English | Category | Notes |
|---|---|---|---|---|---|---|
| 68 | `src/animation/clips/heart.ts` | `heart` | နှလုံး | Heart | body | |
| 69 | `src/animation/clips/aids.ts` | `aids` | AIDS | AIDS | disease | |
| 70 | `src/animation/clips/diarrhea.ts` | `diarrhea` | ဝမ်းရောဂါ | Diarrhea | disease | |
| 71 | `src/animation/clips/asthma.ts` | `asthma` | ရင်ကြပ်ပန်းနာရောဂါ | Asthma | disease | |
| 72 | `src/animation/clips/brain.ts` | `brain` | ဦးနှောက် | Brain | body | |
| 73 | `src/animation/clips/throat.ts` | `throat` | လည်ချောင်း | Throat | body | |
| 74 | `src/animation/clips/muscle.ts` | `muscle` | ကြွက်သား | Muscle | body | |
| 75 | `src/animation/clips/liver.ts` | `liver` | အသည်း | Liver | body | |
| 76 | `src/animation/clips/small_intestine.ts` | `small_intestine` | အူသိမ် | Small intestine | body | |
| 77 | `src/animation/clips/large_intestine.ts` | `large_intestine` | အူမကြီး | Large intestine | body | |
| 78 | `src/animation/clips/how.ts` | `how` | ဘယ်လို | How | question | Exists in `demoSigns.ts` |
| 79 | `src/animation/clips/thank_you.ts` | `thank_you` | ကျေးဇူးတင်ပါတယ် | Thank you | greeting | Exists in `signs.ts` |
| 80 | `src/animation/clips/please.ts` | `please` | ကျေးဇူးပြု | Please | greeting | Exists in `signs.ts` |
| 81 | `src/animation/clips/help.ts` | `help` | ကူညီ | Help | action | Exists in `signs.ts` |
| 82 | `src/animation/clips/sick.ts` | `sick` | နေမကောင်း | Sick | health | Exists as `src/animation/sick.ts` |
| 83 | `src/animation/clips/headache.ts` | `headache` | ခေါင်းကိုက် | Headache | symptom | Exists as `src/animation/headache.ts` |
| 84 | `src/animation/clips/what_happened.ts` | `what_happened` | ဘာဖြစ်လို့လဲ | What happened | question | Exists in `demoSigns.ts` |
| 85 | `src/animation/clips/yes.ts` | `yes` | ဟုတ်ကဲ့ | Yes | answer | Planned in `greetingInput.ts`, no clip yet |
| 86 | `src/animation/clips/no.ts` | `no` | မဟုတ်ပါ | No | answer | No clip yet |
| 87 | `src/animation/clips/hospital.ts` | `hospital` | ဆေးရုံ | Hospital | people | No clip yet |
| 88 | `src/animation/clips/pain.ts` | `pain` | နာကျင် | Pain | symptom | No clip yet |
| 89 | `src/animation/clips/water.ts` | `water` | ရေ | Water | other | No clip yet |
| 90 | `src/animation/clips/toilet.ts` | `toilet` | အိမ်သာ | Toilet | other | No clip yet |
| 91 | `src/animation/clips/name.ts` | `name` | နာမည် | Name | people | No clip yet |
| 92 | `src/animation/clips/you.ts` | `you` | သင် | You | people | No clip yet |
| 93 | *add when the word list is ready* | | | | | Do not invent an id |
| 94 | *add when the word list is ready* | | | | | |
| 95 | *add when the word list is ready* | | | | | |
| 96 | *add when the word list is ready* | | | | | |
| 97 | *add when the word list is ready* | | | | | |
| 98 | *add when the word list is ready* | | | | | |
| 99 | *add when the word list is ready* | | | | | |
| 100 | *add when the word list is ready* | | | | | |

Signs 1–78 match `msl77_signs.py` (do not rename those ids). Signs 79–92 are extra clinic words the chat UI already knows. Signs 93–100 stay empty until you add them at the **end** of `msl77_signs.py` — never insert in the middle.

---

## Git (so three people do not overwrite each other)

- One branch per person is enough, for example `anim/person-1`.
- Commit often: one sign per commit is easiest to review (`Add fever 3D clip`).
- Never rewrite someone else’s `clips/*.ts` file.
- Pull before you touch `signs.ts`, `greetingInput.ts`, or `translation.ts`.

Header to paste at the top of every new clip:

```ts
/**
 * Animator: Aung
 * Sign id:  fever
 * Myanmar:  အဖျား
 * English:  Fever
 */
```

---

## Checklist before you say a sign is done

- [ ] File name is the sign id, lowercase, no spaces
- [ ] Starts and ends at rest
- [ ] Preview URL loops the clip
- [ ] Registered in `signs.ts`, `greetingInput.ts`, and `SIGN_LABELS`
- [ ] Typed Myanmar text in the app plays this clip (or preview works)
- [ ] A signer has looked at handshape and timing
