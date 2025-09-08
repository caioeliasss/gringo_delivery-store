// src/utils/systemMessageNotifier.js
let systemMessageHandler = null;

export const setSystemMessageHandler = (handler) => {
  systemMessageHandler = handler;
};

export const showRateLimitMessage = () => {
  if (systemMessageHandler) {
    systemMessageHandler();
  } else {
    console.warn(
      "Sistema temporariamente instável. Voltará ao normal em instantes."
    );
  }
};

export const clearSystemMessageHandler = () => {
  systemMessageHandler = null;
};
