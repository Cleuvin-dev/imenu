declare module "jsqr" {
  type QRCode = { data: string } | null;
  function jsQR(data: Uint8ClampedArray, width: number, height: number): QRCode;
  export default jsQR;
}
