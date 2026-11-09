import { ANIMATED_SIGN_IDS, type SignId } from '../animation/signs'
import { signLabel } from '../api/translation'
import SignGif from './SignGif'

/**
 * Pose inspection page: `?preview=drink,eat` loops those clips,
 * `?preview=all` shows every clip, `&t=1.2` freezes them at 1.2 s,
 * `&seq` plays the listed clips as one signed sentence.
 */
export default function SignPreview({ query }: { query: string }) {
  const params = new URLSearchParams(query)
  const raw = params.get('preview') ?? 'all'
  const at = params.get('t')
  const ids = (raw === 'all' ? [...ANIMATED_SIGN_IDS] : raw.split(',')).filter((id): id is SignId =>
    (ANIMATED_SIGN_IDS as readonly string[]).includes(id))
  const time = at === null ? undefined : Number(at)
  const times = params.get('times')?.split(',').map(Number)
  if (times) {
    // One clip frozen at several moments: `?preview=drink&times=.8,1.2,1.6`
    return (
      <div className="flex min-h-dvh flex-wrap content-start justify-center gap-2 bg-white p-2">
        {times.map((moment) => (
          <figure key={moment} className="flex flex-col items-center">
            <SignGif signs={ids} label={`${moment}`} className="w-60" at={moment} />
            <figcaption className="text-sm font-bold">{ids.join('+')} @ {moment}s</figcaption>
          </figure>
        ))}
      </div>
    )
  }
  if (params.has('seq')) {
    return (
      <div className="flex min-h-dvh items-start justify-center bg-white p-4">
        <SignGif signs={ids} label="sequence" className="w-[440px]" at={time} />
      </div>
    )
  }
  return (
    <div className="flex min-h-dvh flex-wrap content-start justify-center gap-4 bg-white p-4">
      {ids.map((id) => (
        <figure key={id} className="flex flex-col items-center">
          <SignGif signs={[id]} label={id} className="w-72" at={time} />
          <figcaption className="mt-1 text-lg font-bold">{signLabel(id)} · {id}</figcaption>
        </figure>
      ))}
    </div>
  )
}
