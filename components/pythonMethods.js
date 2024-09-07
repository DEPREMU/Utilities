function capitalize(text) {
  try {
    textToReturn = "";
    for (let x = 0; x < text.length; x++) {
      if (x == 0) {
        textToReturn += text[x].toUpperCase();
      } else {
        textToReturn += text[x];
      }
    }
    return textToReturn;
  } catch (error) {
    return error;
  }
}

export { capitalize };
