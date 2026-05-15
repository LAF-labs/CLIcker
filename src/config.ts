import Conf from "conf";

export interface CLIckerConfig {
  defaultTarget?: string;
}

export const config = new Conf<CLIckerConfig>({
  projectName: "cliccker",
});
