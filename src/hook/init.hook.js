import {registerSettings} from "../config/register-settings.js";

Hooks.once("init", function () {
    registerSettings();
});
