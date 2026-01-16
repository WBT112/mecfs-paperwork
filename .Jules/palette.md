## 2024-08-01 - Hover and Focus-Visible State Parity

**Learning:** When implementing a `:hover` state for mouse-driven interactions, it is a critical accessibility miss to not provide an equivalent `:focus-visible` state for keyboard navigators. Both should provide the same level of clear, visual feedback to the user, ensuring a consistent and accessible experience regardless of the input method.

**Action:** For all future UX polish involving interactive elements, I will treat `:hover` and `:focus-visible` as a pair. Any style changes (background, border, underline, etc.) applied to one will be applied to the other to guarantee a uniform experience.