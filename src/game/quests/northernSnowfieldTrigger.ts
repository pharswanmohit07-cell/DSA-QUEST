export type NorthernSnowfieldBodyBounds = {
  center: { x: number }
  bottom: number
}

export function isInsideNorthernSnowfieldTrigger(
  body: NorthernSnowfieldBodyBounds,
): boolean {
  return (
    body.center.x >= 184 &&
    body.center.x <= 216 &&
    body.bottom >= 272 &&
    body.bottom <= 304
  )
}
