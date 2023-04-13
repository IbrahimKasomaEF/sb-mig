import Logger from "../utils/logger.js";

import { getAllComponents } from "./components.js";
import { getPreset } from "./presets.js";

export const getComponentPresets = (componentName: string | undefined) => {
    Logger.log(`Trying to get all '${componentName}' presets.`);

    return getAllComponents().then(async (res) => {
        const componentPresets = res.components.filter(
            (component: any) => component.name === componentName
        );

        if (componentPresets.length > 0) {
            if (componentPresets[0].all_presets.length === 0) {
                Logger.warning(
                    `There is no presets for: '${componentName}' component`
                );
                return false;
            }
            return Promise.all(
                componentPresets[0].all_presets.map((preset: any) =>
                    getPreset(preset.id).catch((err: any) => Logger.error(err))
                )
            );
        }
        Logger.warning(`There is no '${componentName}' component`);
        return false;
    });
};
