// types/adm-zip.d.ts
declare module "adm-zip" {
  class AdmZip {
    constructor(input?: Buffer | string);
    getEntries(): Array<{
      entryName: string;
      getData(): Buffer;
    }>;
  }
  export default AdmZip;
}