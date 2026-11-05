import { writeFile } from "node:fs/promises";
import { ambientWav } from "../lib/music-storage";
void ambientWav()
  .arrayBuffer()
  .then((buffer) =>
    writeFile("../../work/myroom-audio-test.wav", Buffer.from(buffer)),
  );
