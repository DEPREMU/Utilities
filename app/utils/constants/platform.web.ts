import windowModule from "../modules/WindowModule";

let isElectron = false;

windowModule.isElectronBuild().then((result) => {
  isElectron = result;
});

export { isElectron };
