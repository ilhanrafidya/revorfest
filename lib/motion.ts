/** Apple-style ease-out curve used across the app. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 34 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 220, damping: 22 } as const;
