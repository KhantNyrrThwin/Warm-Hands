import { BREAKFAST_DURATION, createBreakfastAnimation } from './clips/breakfast';
import { DINNER_DURATION, createDinnerAnimation } from './clips/dinner';
import { DOCTOR_DURATION, createDoctorAnimation } from './clips/doctor';
import { LUNCH_DURATION, createLunchAnimation } from './clips/lunch';
import { DRINK_DURATION, createDrinkAnimation } from './clips/drink';
import { EAT_DURATION, createEatAnimation } from './clips/eat';
import { FINISHED_DURATION, HAVE_YOU_FINISHED_DURATION, createFinishedAnimation, createHaveYouFinishedAnimation } from './clips/finished';
import { FIVE_DURATION, createFiveAnimation } from './clips/five';
import { HOW_DURATION, createHowAnimation } from './clips/how';
import { MEDICINE_DURATION, createMedicineAnimation } from './clips/medicine';
import { MINUTE_DURATION, createMinuteAnimation } from './clips/minute';
import { NURSE_DURATION, createNurseAnimation } from './clips/nurse';
import { WAKE_UP_DURATION, createWakeUpAnimation } from './clips/wake_up';
import { TIME_DURATION, createTimeAnimation } from './clips/time';
import { HOUR_DURATION, createHourAnimation } from './clips/hour';
import { TOMORROW_DURATION, createTomorrowAnimation } from './clips/tomorrow';
import { DAY_AFTER_TOMORROW_DURATION, createDayAfterTomorrowAnimation } from './clips/day_after_tomorrow';
import { MEET_DURATION, createMeetAnimation } from './clips/meet';
import { GO_DURATION, createGoAnimation } from './clips/go';
import { FATHER_DURATION, createFatherAnimation } from './clips/father';
import { MOTHER_DURATION, createMotherAnimation } from './clips/mother';
import { OLDER_SISTER_DURATION, createOlderSisterAnimation } from './clips/older_sister';
import { YOUNGER_BROTHER_DURATION, createYoungerBrotherAnimation } from './clips/younger_brother';
import { OLDER_BROTHER_DURATION, createOlderBrotherAnimation } from './clips/older_brother';
import { SAFE_DURATION, createSafeAnimation } from './clips/safe';
import { POUND_DURATION, createPoundAnimation } from './clips/pound';
import { OBVIOUSLY_DURATION, createObviouslyAnimation } from './clips/obviously';
import { SEVERE_DURATION, createSevereAnimation } from './clips/severe';
import { EL_NINO_DURATION, createElNinoAnimation } from './clips/el_nino';
import { COUGH_DURATION, createCoughAnimation } from './clips/cough';
import { TOOTHACHE_DURATION, createToothacheAnimation } from './clips/toothache';
import { HUNDRED_DURATION, createHundredAnimation } from './clips/hundred';
import { KILOGRAM_DURATION, createKilogramAnimation } from './clips/kilogram';
import { GRAM_DURATION, createGramAnimation } from './clips/gram';
import { STOMACH_ACHE_DURATION, createStomachAcheAnimation } from './clips/stomach_ache';
import { createUnfinishedAnimation, UNFINISHED_DURATION } from './clips/unfinished';
import { WHAT_HAPPENED_DURATION, createWhatHappenedAnimation } from './clips/what_happened';
export const DEMO_SIGN_IDS = ['what_happened', 'stomach_ache', 'how', 'drink', 'eat', 'breakfast', 'lunch', 'dinner', 'finished', 'have_you_finished', 'unfinished', 'five', 'minute', 'doctor', 'nurse', 'wake_up', 'time', 'hour', 'tomorrow', 'day_after_tomorrow', 'meet', 'go', 'father', 'mother', 'older_sister', 'younger_brother', 'older_brother', 'safe', 'pound', 'obviously', 'severe', 'el_nino', 'hundred', 'kilogram', 'gram', 'cough', 'toothache'];
export const DEMO_DURATIONS = {
    what_happened: WHAT_HAPPENED_DURATION,
    stomach_ache: STOMACH_ACHE_DURATION,
    how: HOW_DURATION,
    drink: DRINK_DURATION,
    eat: EAT_DURATION,
    breakfast: BREAKFAST_DURATION,
    lunch: LUNCH_DURATION,
    dinner: DINNER_DURATION,
    finished: FINISHED_DURATION,
    have_you_finished: HAVE_YOU_FINISHED_DURATION,
    unfinished: UNFINISHED_DURATION,
    five: FIVE_DURATION,
    minute: MINUTE_DURATION,
    doctor: DOCTOR_DURATION,
    nurse: NURSE_DURATION,
    wake_up: WAKE_UP_DURATION,
    time: TIME_DURATION,
    hour: HOUR_DURATION,
    tomorrow: TOMORROW_DURATION,
    day_after_tomorrow: DAY_AFTER_TOMORROW_DURATION,
    meet: MEET_DURATION,
    go: GO_DURATION,
    father: FATHER_DURATION,
    mother: MOTHER_DURATION,
    older_sister: OLDER_SISTER_DURATION,
    younger_brother: YOUNGER_BROTHER_DURATION,
    older_brother: OLDER_BROTHER_DURATION,
    safe: SAFE_DURATION,
    pound: POUND_DURATION,
    obviously: OBVIOUSLY_DURATION,
    severe: SEVERE_DURATION,
    el_nino: EL_NINO_DURATION,
    hundred: HUNDRED_DURATION,
    kilogram: KILOGRAM_DURATION,
    gram: GRAM_DURATION,
    cough: COUGH_DURATION,
    toothache: TOOTHACHE_DURATION,
    medicine: MEDICINE_DURATION,
};
export function createDemoSignLibrary(model) {
    return {
        what_happened: createWhatHappenedAnimation(model),
        stomach_ache: createStomachAcheAnimation(model),
        how: createHowAnimation(model),
        drink: createDrinkAnimation(model),
        eat: createEatAnimation(model),
        breakfast: createBreakfastAnimation(model),
        lunch: createLunchAnimation(model),
        dinner: createDinnerAnimation(model),
        finished: createFinishedAnimation(model),
        have_you_finished: createHaveYouFinishedAnimation(model),
        unfinished: createUnfinishedAnimation(model),
        five: createFiveAnimation(model),
        minute: createMinuteAnimation(model),
        doctor: createDoctorAnimation(model),
        nurse: createNurseAnimation(model),
        wake_up: createWakeUpAnimation(model),
        time: createTimeAnimation(model),
        hour: createHourAnimation(model),
        tomorrow: createTomorrowAnimation(model),
        day_after_tomorrow: createDayAfterTomorrowAnimation(model),
        meet: createMeetAnimation(model),
        go: createGoAnimation(model),
        father: createFatherAnimation(model),
        mother: createMotherAnimation(model),
        older_sister: createOlderSisterAnimation(model),
        younger_brother: createYoungerBrotherAnimation(model),
        older_brother: createOlderBrotherAnimation(model),
        safe: createSafeAnimation(model),
        pound: createPoundAnimation(model),
        obviously: createObviouslyAnimation(model),
        severe: createSevereAnimation(model),
        el_nino: createElNinoAnimation(model),
        hundred: createHundredAnimation(model),
        kilogram: createKilogramAnimation(model),
        gram: createGramAnimation(model),
        cough: createCoughAnimation(model),
        toothache: createToothacheAnimation(model),
        medicine: createMedicineAnimation(model),
    };
}
