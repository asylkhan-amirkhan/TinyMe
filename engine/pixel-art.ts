import type { Product } from "@/domain/model";
export function furnitureCanvas(p: Product, on = false) {
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  const dark = "#574537",
    wood = "#b18458",
    light = "#e4c496",
    leaf = p.color;
  if (p.kind === "desk") {
    r(14, 36, 68, 32, dark);
    r(18, 32, 60, 25, p.color);
    r(18, 34, 60, 3, light);
    r(20, 66, 6, 18, dark);
    r(70, 66, 6, 18, dark);
    r(24, 39, 23, 14, "#e8dfca");
    r(53, 37, 15, 11, "#7a9986");
    r(54, 48, 13, 3, dark);
    r(31, 38, 1, 16, "#bcb5a5");
  }
  if (p.kind === "chair") {
    r(28, 17, 40, 35, dark);
    r(31, 19, 34, 26, p.color);
    r(27, 49, 43, 23, dark);
    r(30, 48, 37, 18, p.color);
    r(31, 70, 6, 16, dark);
    r(61, 70, 6, 16, dark);
    r(35, 23, 26, 3, "#b9c4a5");
  }
  if (p.kind === "bed") {
    r(15, 14, 65, 70, dark);
    r(19, 12, 57, 16, wood);
    r(20, 28, 55, 50, "#f0e6d4");
    r(25, 30, 20, 13, "#fff7e8");
    r(50, 30, 20, 13, "#fff7e8");
    r(20, 48, 55, 32, p.color);
    r(23, 52, 49, 3, "#e8dec9");
    r(22, 82, 7, 6, dark);
    r(68, 82, 7, 6, dark);
  }
  if (p.kind === "plant") {
    r(43, 32, 5, 35, "#567344");
    r(29, 66, 37, 8, dark);
    r(33, 73, 29, 15, "#b97f60");
    r(37, 87, 21, 3, dark);
    [
      [22, 35],
      [47, 20],
      [51, 42],
      [28, 12],
      [15, 49],
      [57, 31],
    ].forEach(([x, y]) => {
      r(x, y, 19, 15, leaf);
      r(x + 4, y - 5, 12, 23, leaf);
      r(x + 5, y + 1, 3, 11, "#a4b27a");
    });
  }
  if (p.kind === "lamp") {
    if (on) {
      g.fillStyle = "#ffe7a455";
      g.beginPath();
      g.arc(48, 43, 42, 0, 7);
      g.fill();
    }
    r(45, 43, 6, 39, dark);
    r(30, 82, 36, 6, dark);
    r(26, 22, 44, 25, p.color);
    r(31, 16, 34, 6, p.color);
    r(21, 42, 54, 7, p.color);
    r(24, 48, 48, 4, on ? "#ffedac" : dark);
    r(34, 24, 4, 16, "#f3dfac");
  }
  if (p.kind === "rug") {
    r(5, 30, 86, 42, p.color);
    r(9, 34, 78, 34, "#e3c49f");
    r(13, 38, 70, 26, p.color);
    r(24, 46, 48, 10, "#e3c49f");
    for (let x = 8; x < 90; x += 7) {
      r(x, 26, 3, 4, "#d7b98c");
      r(x, 72, 3, 4, "#d7b98c");
    }
  }
  if (p.kind === "shelf") {
    r(12, 12, 72, 75, dark);
    r(16, 15, 64, 69, p.color);
    for (let y = 19; y < 80; y += 22) {
      for (let x = 20; x < 75; x += 10) {
        r(
          x,
          y,
          7,
          17,
          ["#7c9989", "#d6ad68", "#ad7161", "#c4c0a1"][Math.floor(x / 10) % 4],
        );
        r(x + 1, y + 3, 5, 2, "#e2cba6");
      }
      r(16, y + 18, 64, 4, dark);
    }
  }
  if (p.kind === "art") {
    r(23, 12, 50, 60, dark);
    r(27, 16, 42, 52, "#c6a16c");
    r(31, 20, 34, 44, "#f1dfba");
    r(48, 26, 9, 9, p.color);
    r(31, 48, 34, 16, "#8f9a77");
    r(38, 40, 10, 12, "#8f9a77");
    r(53, 44, 12, 10, "#6f856d");
  }
  if (p.kind === "sofa") {
    r(10, 26, 76, 47, dark);
    r(14, 23, 68, 33, p.color);
    r(17, 52, 62, 23, p.color);
    r(7, 40, 13, 33, p.color);
    r(76, 40, 13, 33, p.color);
    r(22, 76, 6, 8, dark);
    r(70, 76, 6, 8, dark);
    r(46, 29, 3, 40, "#647c60");
    r(21, 34, 18, 16, "#d4bd92");
  }
  if (p.kind === "record") {
    r(15, 29, 66, 46, dark);
    r(19, 26, 58, 39, p.color);
    g.fillStyle = "#343c37";
    g.beginPath();
    g.arc(43, 45, 16, 0, 7);
    g.fill();
    r(40, 42, 6, 6, on ? "#d9b76b" : "#c9b9a2");
    r(66, 34, 3, 24, "#ded5bd");
    r(58, 56, 9, 3, "#ded5bd");
    r(23, 69, 48, 3, "#d2ac7f");
  }
  return c;
}
export function roomCanvas() {
  const c = document.createElement("canvas");
  c.width = 832;
  c.height = 656;
  const g = c.getContext("2d")!;
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  r(16, 25, 800, 606, "#3c473b");
  r(24, 18, 784, 600, "#745c44");
  r(32, 25, 768, 104, "#dfd2ae");
  r(32, 125, 768, 512, "#be9669");
  for (let y = 0; y < 16; y++) {
    r(32, 125 + y * 32, 768, 2, "#a97e54");
    for (let x = 0; x < 24; x++) {
      const xx = 32 + x * 32;
      r(
        xx,
        127 + y * 32,
        31,
        29,
        ["#c8a374", "#c3a071", "#cba77b", "#c6a171"][(x * 7 + y * 13) % 4],
      );
      if ((x + y) % 3 === 0) r(xx + 6, 138 + y * 32, 17, 1, "#b68e60");
    }
  }
  r(32, 116, 768, 9, "#8e6e4b");
  r(32, 112, 768, 4, "#b49467");
  // Wide window, garden and warm curtains, deliberately on the fixed wall.
  r(336, 34, 160, 76, "#8d7152");
  r(342, 39, 148, 63, "#c1d0c2");
  r(346, 43, 140, 55, "#a6bfbb");
  r(346, 80, 140, 18, "#91a47a");
  r(358, 69, 25, 29, "#7f9d75");
  r(454, 65, 24, 33, "#7f9d75");
  r(412, 39, 6, 63, "#e6d7b4");
  r(342, 70, 148, 4, "#e6d7b4");
  r(330, 101, 172, 9, "#937553");
  r(330, 99, 172, 3, "#f1e3c1");
  r(317, 27, 19, 75, "#b59670");
  r(495, 27, 19, 75, "#b59670");
  // Sunlight on the floor.
  g.fillStyle = "#fff0c218";
  g.beginPath();
  g.moveTo(342, 126);
  g.lineTo(490, 126);
  g.lineTo(620, 360);
  g.lineTo(400, 360);
  g.fill();
  r(24, 618, 784, 18, "#70563f");
  r(32, 618, 768, 5, "#a9865d");
  return c;
}
