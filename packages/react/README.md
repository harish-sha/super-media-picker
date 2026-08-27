# @company/media-react

Accessible React UI for the messaging media picker. Phase 2 provides an emoji-first picker with category navigation, search, normalized selection, responsive sizing, themes, and grid keyboard navigation.

```tsx
import { MediaPicker } from "@company/media-react";
import "@company/media-react/styles.css";

<MediaPicker
  features={{ emoji: true }}
  onSelect={(item) => console.log(item)}
/>;
```
