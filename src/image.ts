import type { QrCodeGenerateData, QrCodeGenerateOptions } from 'uqr';
import { encode } from 'uqr';

export type PixelStyleType = 'Rect' | 'Rounded' | 'Dot';

export type MarkerStyleType = 'Circle' | 'Auto';

export interface DrawOptions {
  lightColor?: string;
  darkColor?: string;
  pixelSize?: number;
  pixelStyle?: PixelStyleType;
  markerStyle?: MarkerStyleType;
  logo?: File;
  background?: File;
}

export type QrCodeGenerateImageOptions = QrCodeGenerateOptions & DrawOptions;

function drawRectCell({
  x,
  y,
  color,
  size,
  ctx,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

function drawDotCell({
  x,
  y,
  color,
  radius,
  ctx,
}: {
  x: number;
  y: number;
  color: string;
  radius: number;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fill();
}

function drawRoundedCell({
  x,
  y,
  size,
  isDark,
  lightColor,
  darkColor,
  ctx,
  cornerIsRounded: { LT, RT, LB, RB },
}: {
  x: number;
  y: number;
  size: number;
  isDark: boolean;
  lightColor: string;
  darkColor: string;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  cornerIsRounded: { LT: boolean; RT: boolean; LB: boolean; RB: boolean };
}) {
  const halfSize = size / 2;

  const lineWidth = 1;
  ctx.lineWidth = lineWidth;

  const radius = halfSize - lineWidth;

  const color = isDark ? darkColor : lightColor;
  const bgColor = isDark ? lightColor : darkColor;

  if (radius > 0) {
    ctx.fillStyle = LT ? bgColor : color;
    ctx.fillRect(x, y, halfSize, halfSize);

    ctx.fillStyle = RT ? bgColor : color;
    ctx.fillRect(x + halfSize, y, halfSize, halfSize);

    ctx.fillStyle = LB ? bgColor : color;
    ctx.fillRect(x, y + halfSize, halfSize, halfSize);

    ctx.fillStyle = RB ? bgColor : color;
    ctx.fillRect(x + halfSize, y + halfSize, halfSize, halfSize);

    drawDotCell({ x: x + halfSize, y: y + halfSize, color, radius, ctx });
  } else {
    drawRectCell({ x, y, color, size, ctx });
  }
}

function parseImageSizeData(width: number, height: number) {
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;

  if (width > height) {
    x = (width - height) / 2;
    w = height;
  } else if (width < height) {
    y = (height - width) / 2;
    h = width;
  }

  return {
    x,
    y,
    w,
    h,
  };
}

export async function renderImage(
  data: QrCodeGenerateData,
  options: QrCodeGenerateImageOptions = {},
): Promise<File> {
  const {
    lightColor = '#fff',
    darkColor = '#000',
    pixelSize = 10,
    pixelStyle = 'Rect',
    markerStyle = 'Auto',
    logo,
    background,
    border = 0,
  } = options;

  const qr = encode(data, options);

  // base data
  const moduleCount = qr.size;

  const $isDark = (x: number, y: number) => {
    return qr.data[x][y];
  };

  const maxSize = 16384;

  const qrcodeSize = moduleCount * pixelSize;

  const size = qrcodeSize < maxSize ? qrcodeSize : maxSize;

  // init offscreenCanvas
  const offscreenCanvas = new OffscreenCanvas(size, size);

  const ctx = offscreenCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get the rendering context.');
  }

  offscreenCanvas.height = size;
  offscreenCanvas.width = size;

  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, size, size);

  // draw pixel
  for (let x = 0; x < moduleCount; x++) {
    for (let y = 0; y < moduleCount; y++) {
      const xPos = x * pixelSize;
      const yPos = y * pixelSize;

      const isDark = $isDark(x, y);

      if (pixelStyle === 'Rounded') {
        const leftIsDark = x - 1 >= 0 ? $isDark(x - 1, y) : false;
        const topIsDark = y - 1 >= 0 ? $isDark(x, y - 1) : false;
        const rightIsDark = x + 1 < moduleCount ? $isDark(x + 1, y) : false;
        const bottomIsDark = y + 1 < moduleCount ? $isDark(x, y + 1) : false;

        const leftTopIsDark = leftIsDark && topIsDark && $isDark(x - 1, y - 1);
        const rightTopIsDark =
          rightIsDark && topIsDark && $isDark(x + 1, y - 1);
        const rightBottomIsDark =
          rightIsDark && bottomIsDark && $isDark(x + 1, y + 1);
        const leftBottomIsDark =
          leftIsDark && bottomIsDark && $isDark(x - 1, y + 1);

        const LT = isDark ? !leftIsDark && !topIsDark : leftTopIsDark;
        const RT = isDark ? !rightIsDark && !topIsDark : rightTopIsDark;
        const LB = isDark ? !leftIsDark && !bottomIsDark : leftBottomIsDark;
        const RB = isDark ? !rightIsDark && !bottomIsDark : rightBottomIsDark;

        drawRoundedCell({
          x: xPos,
          y: yPos,
          size: pixelSize,
          isDark,
          lightColor,
          darkColor,
          ctx,
          cornerIsRounded: {
            LT,
            RT,
            LB,
            RB,
          },
        });
      } else if (pixelStyle === 'Dot') {
        const radius = pixelSize / 2;

        if (isDark) {
          drawDotCell({
            x: xPos + radius,
            y: yPos + radius,
            color: darkColor,
            radius,
            ctx,
          });
        }
      } else {
        if (isDark) {
          drawRectCell({
            x: xPos,
            y: yPos,
            color: darkColor,
            size: pixelSize,
            ctx,
          });
        }
      }
    }
  }

  // draw marker
  if (markerStyle === 'Circle') {
    const markerOuterSize = 7;
    const markerDividerSize = 5;
    const markerInnerSize = 3;

    const borderWidth = border * pixelSize;
    const pos = (moduleCount - markerOuterSize - border) * pixelSize;

    const p1 = [borderWidth, borderWidth];
    const p2 = [pos, borderWidth];
    const p3 = [borderWidth, pos];

    for (const p of [p1, p2, p3]) {
      drawRectCell({
        x: p[0] - pixelSize / 2,
        y: p[1] - pixelSize / 2,
        color: lightColor,
        size: markerOuterSize * pixelSize + pixelSize,
        ctx,
      });

      const outerRadius = (markerOuterSize * pixelSize) / 2;
      const dividerRadius = (markerDividerSize * pixelSize) / 2;
      const innerRadius = (markerInnerSize * pixelSize) / 2;

      const centerX = p[0] + outerRadius;
      const centerY = p[1] + outerRadius;

      drawDotCell({
        x: centerX,
        y: centerY,
        color: darkColor,
        radius: outerRadius,
        ctx,
      });

      drawDotCell({
        x: centerX,
        y: centerY,
        color: lightColor,
        radius: dividerRadius,
        ctx,
      });

      drawDotCell({
        x: centerX,
        y: centerY,
        color: darkColor,
        radius: innerRadius,
        ctx,
      });
    }
  }

  // draw background
  if (background) {
    ctx.globalCompositeOperation = 'lighten';
    const image = new Image();
    const url = URL.createObjectURL(background);

    await new Promise<void>((resolve) => {
      image.onload = () => {
        resolve();
      };
      image.src = url;
    });

    const { x, y, w, h } = parseImageSizeData(image.width, image.height);
    ctx.drawImage(image, x, y, w, h, 0, 0, size, size);
    URL.revokeObjectURL(url);
  }

  // draw logo
  if (logo) {
    const image = new Image();
    const url = URL.createObjectURL(logo);

    const metric = Math.round(size / 5);

    const logoSize = Math.round(metric / 5) * 4;

    ctx.strokeStyle = lightColor;
    ctx.fillStyle = lightColor;
    ctx.roundRect(
      size / 2 - metric / 2,
      size / 2 - metric / 2,
      metric,
      metric,
      metric / 10,
    );
    ctx.fill();

    image.onload = () => {
      const { x, y, w, h } = parseImageSizeData(image.width, image.height);
      ctx.drawImage(
        image,
        x,
        y,
        w,
        h,
        size / 2 - logoSize / 2,
        size / 2 - logoSize / 2,
        logoSize,
        logoSize,
      );
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  const blob = await offscreenCanvas.convertToBlob();

  const file = new File([blob], 'qrcode.png', { type: 'image/png' });

  return file;
}
