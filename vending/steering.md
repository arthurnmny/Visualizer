# Vending Machine UI - Version 3 Refactor

## Objective

Refactor the existing vending machine UI into a cleaner architecture while preserving the visual appearance.

This is NOT a redesign.

The goal is to eliminate duplicated button HTML and replace it with a reusable state-driven system that will support future game logic.

Everything that currently works visually should continue to work.

---

# High Level Goals

Replace the current implementation of:

- 12 physical buttons
- duplicated IDs
- multiple copies of button HTML

with:

- exactly 4 physical buttons
- state-driven button content
- reusable transition animation
- reusable menu/page system

The existing visual appearance should remain unchanged.

---

# DO NOT CHANGE

Do NOT redesign any UI.

Do NOT modify:

- CRT effects
- stickers
- fonts
- colors
- screen styling
- cabinet layout
- sizing
- hover animations
- press animations
- message typing system
- random sticker logic

Keep all existing CSS unless absolutely necessary.

Only refactor the button/menu architecture.

---

# Button System

There should only ever be FOUR physical buttons.

Example:

```html
<div class="button-stack">

<button id="btn1" class="vbtn"></button>

<button id="btn2" class="vbtn"></button>

<button id="btn3" class="vbtn"></button>

<button id="btn4" class="vbtn"></button>

</div>
```

There should never again be multiple copies of these buttons.

---

# Buttons are Slots

The four buttons represent slots.

Their contents change depending on the active menu.

Example:

Menu A

Slot 1 -> CYBER-COLA

Slot 2 -> PILLS

Slot 3 -> ENER-G

Slot 4 -> CANDY

Later...

Menu B

Slot 1 -> YES

Slot 2 -> NO

Slot 3 -> BACK

Slot 4 -> NEXT

The button element itself never changes.

Only its data and images.

---

# Menu Architecture

Create a menu/state object similar to:

```javascript
const MENUS = {

selectItem: {

screen: "▶ SELECT ITEM",

buttons: [

{label:"CYBER-COLA"},

{label:"PILLS"},

{label:"ENER-G"},

{label:"CANDY"}

]

},

confirm: {

screen:"We're actually out of that.<br>Select something else?",

buttons:[

{label:"YES"},

{label:"NO"},

{label:"BACK", outOfOrder:true},

{label:"NEXT", outOfOrder:true}

]

}

}
```

Future menus should be easy to add by editing this object only.

---

# Image Naming

Static:

buttons/LABEL/LABEL_1_static.png

Hover:

buttons/LABEL/LABEL_2_hover.png

Press:

buttons/LABEL/LABEL_3_press_25.png

buttons/LABEL/LABEL_4_press_75.png

buttons/LABEL/LABEL_5_full_press.png

Out of order:

buttons/LABEL/LABEL_8_out_of_order.png

Do not hardcode paths.

Create helper functions.

Example:

```javascript
getImagePath(label,state)
```

---

# Transition Animation

The transition images exist in

buttons/transition/

SLIDE_1.png

SLIDE_2.png

SLIDE_3.png

SLIDE_4.png

These images are the same size as the buttons.

Create a reusable transition function.

Example:

```javascript
transitionButtons(newMenu)
```

Behavior:

STEP 1

Overlay SLIDE_1

STEP 2

Overlay SLIDE_2

STEP 3

Overlay SLIDE_3

STEP 4

Overlay SLIDE_4

The old button is now completely hidden.

Swap every button to the new menu.

Then:

SLIDE_3

SLIDE_2

SLIDE_1

Overlay disappears.

New buttons are visible.

All four buttons transition simultaneously.

NOT one at a time.

---

# Transition Overlay

Do NOT permanently create transition elements.

Instead:

Create overlay

Animate

Remove overlay

The overlay should sit above the button only.

---

# Initial Flow

Initial screen:

▶ SELECT ITEM

Buttons:

CYBER-COLA

PILLS

ENER-G

CANDY

---

# First Interaction

If the user presses ANY of the four buttons:

Immediately change screen text to

We're actually out of that.
Select something else?

Then transition ALL FOUR buttons simultaneously.

New buttons:

YES

NO

BACK (out of order)

NEXT (out of order)

The BACK and NEXT buttons should display

LABEL_8_out_of_order.png

instead of the normal static image.

---

# Existing Hover/Press Animations

Preserve existing hover behavior.

Preserve existing press behavior.

The transition system should be completely independent.

Do not remove existing image helpers.

Instead extend them.

---

# Event Handling

Avoid inline HTML event handlers.

Instead use:

addEventListener()

Example:

mouseenter

mouseleave

click

This should make future state changes easier.

---

# IDs

Remove duplicate IDs.

Every ID must be unique.

---

# Functions

Prefer helper functions like:

renderMenu()

transitionButtons()

setButtonState()

setButtonImage()

setScreenText()

getImagePath()

These should contain the majority of the logic.

Avoid duplicated code.

---

# Future Expandability

This architecture should make it easy to later create:

Drink menu

Confirmation menu

Conversation menu

Inventory menu

Secret horror events

Random events

without adding more HTML.

Adding a new page should only require adding another object to MENUS.

---

# Desired Outcome

The finished codebase should:

✔ have only four button elements

✔ have no duplicated IDs

✔ use a reusable menu/state system

✔ use reusable transition animation

✔ preserve existing visuals

✔ preserve existing button animations

✔ preserve stickers and CRT

✔ be significantly easier to extend

This is an architectural refactor, not a redesign.