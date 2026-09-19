# Prerecorded audio

The app includes MP3 recordings here and falls back to the device's speech synthesizer if a recording is ever absent.

Create identical file sets under `en/` and `he/`:

- `number-1.mp3` through `number-10.mp3`
- `switchCommand.mp3`
- `finished.mp3`

English should say “one” through “ten”, “switch poses”, and “finished”. Hebrew should use the equivalent Hebrew phrases. Keep a short silence at the end of each command; the fixed three-second switch delay starts only after `switchCommand.mp3` finishes.
