// Date-safe JSON serialization for fixtures and golden files.
//
// AWS SDK responses carry live `Date` objects (e.g. a harness's `createdAt` /
// `updatedAt`), and screens/handlers depend on them being real Dates (see
// HarnessListScreen.toRow calling `.toISOString()`). Plain `JSON.stringify`
// turns a Date into a string and `JSON.parse` never turns it back, so a recorded
// fixture would replay a string where the code expects a Date. These helpers tag
// Dates on the way out and revive them on the way in so a round-trip is faithful.

// DATE_TAG marks a serialized Date. The shape is deliberately unlikely to collide
// with real API data.
const DATE_TAG = "$date";

interface TaggedDate {
  [DATE_TAG]: string;
}

function isTaggedDate(value: unknown): value is TaggedDate {
  return (
    typeof value === "object" &&
    value !== null &&
    DATE_TAG in value &&
    typeof (value as TaggedDate)[DATE_TAG] === "string"
  );
}

// stringify serializes `value` to pretty JSON, encoding Date values as
// `{ "$date": "<iso>" }` so they survive the round-trip.
export function stringify(value: unknown): string {
  return JSON.stringify(
    value,
    function (this: unknown, _key, val) {
      // `this[_key]` is the pre-`toJSON` value; a Date has already been coerced
      // to a string by the time it reaches `val`, so read the raw one back off
      // the parent to detect it.
      const raw = (this as Record<string, unknown>)[_key];
      if (raw instanceof Date) {
        return { [DATE_TAG]: raw.toISOString() };
      }
      return val;
    },
    2,
  );
}

// parse is the inverse of stringify: it revives tagged Dates back into real Date
// instances.
export function parse<T = unknown>(text: string): T {
  return JSON.parse(text, (_key, val) => {
    if (isTaggedDate(val)) return new Date(val[DATE_TAG]);
    return val;
  }) as T;
}
