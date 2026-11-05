# Varavuselavu Panda Pack

Cute panda reaction assets cropped from the original generated sheet.

## Reactions
`happy`, `crying`, `thinking`, `sleeping`, `celebrating`, `shocked`, `pleading`

Each reaction contains 4 transparent 256×256 PNG frames. Preview GIFs are included.

## Install / use
1. Copy `Panda.tsx` and the `assets/` directory into your Expo project.
2. Ensure `react-native-reanimated` is already configured (your stack includes it).
3. Import:

```tsx
import Panda from "./Panda";

<Panda reaction="happy" size={88} />
<Panda reaction="thinking" size={64} duration={1800} />
<Panda reaction="sleeping" animated={false} size={96} />
```

## Suggested app usage
- `happy`: transaction saved
- `crying`: overspending / budget warning (use gently)
- `thinking`: AI is processing
- `sleeping`: empty history state
- `celebrating`: staying under budget / milestone
- `shocked`: unusually high expense
- `pleading`: ask user to add missing details

## Performance notes
- PNGs are small, pre-cropped local assets; no network requests.
- Use small sizes (56–96 px) in lists and chat.
- Avoid animating many pandas simultaneously. Set `animated={false}` for offscreen/static use.
- Animation uses 4 frame changes per cycle and is intentionally slow/gentle.
