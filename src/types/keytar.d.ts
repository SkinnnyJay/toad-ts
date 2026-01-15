declare module "keytar" {
  import type { KeytarModule } from "@/utils/credentials/keytarStore";

  const keytar: KeytarModule;
  export default keytar;
}
