import { DRINK_DURATION, createDrinkAnimation } from './clips/drink';
import { EAT_DURATION, createEatAnimation } from './clips/eat';
import { FINISHED_DURATION, createFinishedAnimation } from './clips/finished';
import { FIVE_DURATION, createFiveAnimation } from './clips/five';
import { HOW_DURATION, createHowAnimation } from './clips/how';
import { MEDICINE_DURATION, createMedicineAnimation } from './clips/medicine';
import { MINUTE_DURATION, createMinuteAnimation } from './clips/minute';
import { STOMACH_ACHE_DURATION, createStomachAcheAnimation } from './clips/stomach_ache';
import { WHAT_HAPPENED_DURATION, createWhatHappenedAnimation } from './clips/what_happened';
export const DEMO_SIGN_IDS = ['what_happened', 'stomach_ache', 'how', 'drink', 'eat', 'finished', 'five', 'minute'];
export const DEMO_DURATIONS = {
    what_happened: WHAT_HAPPENED_DURATION,
    stomach_ache: STOMACH_ACHE_DURATION,
    how: HOW_DURATION,
    drink: DRINK_DURATION,
    eat: EAT_DURATION,
    finished: FINISHED_DURATION,
    five: FIVE_DURATION,
    minute: MINUTE_DURATION,
    medicine: MEDICINE_DURATION,
};
export function createDemoSignLibrary(model) {
    return {
        what_happened: createWhatHappenedAnimation(model),
        stomach_ache: createStomachAcheAnimation(model),
        how: createHowAnimation(model),
        drink: createDrinkAnimation(model),
        eat: createEatAnimation(model),
        finished: createFinishedAnimation(model),
        five: createFiveAnimation(model),
        minute: createMinuteAnimation(model),
        medicine: createMedicineAnimation(model),
    };
}
