/**
 * Body keys that first turn the upper body (and the head with it) by
 * `degrees`, hold the turn while the sign is made, and turn back at the end.
 * Positive degrees turn toward the viewer's right on screen.
 * `extra` adds more body and head turn from `extra.at` on, for signs where the
 * body's natural lean toward a raised hand would otherwise undo part of the turn.
 *
 * Meant for LEFT-handed clips (`createDemoClip(..., 'left')`), which mirror
 * their body keys, so the sign is flipped here to keep the screen direction.
 */
/**
 * Keys for a turn that happens only during part of a sign: from `start` the
 * body turns `degrees` (positive = screen right), is fully turned at `turned`,
 * holds until `holdUntil`, and is facing front again at `back`.
 * Wrap with `{ time: 0 }` ... `{ time: duration }`. LEFT-handed clips only.
 */
export function turnBetween(degrees, start, turned, holdUntil, back) {
    const turn = -degrees * Math.PI / 180;
    return [{ time: start }, { time: turned, turn }, { time: holdUntil, turn }, { time: back }];
}
export function turnedBody(degrees, turned, holdUntil, duration, extra) {
    const rad = (d) => -d * Math.PI / 180;
    const base = { turn: rad(degrees) };
    const held = extra ? { turn: rad(degrees + extra.body), headTurn: rad(extra.head) } : base;
    return [
        { time: 0 },
        { time: .05 },
        { time: turned, ...base },
        ...(extra ? [{ time: extra.at, ...held }] : []),
        { time: holdUntil, ...held },
        { time: duration },
    ];
}
