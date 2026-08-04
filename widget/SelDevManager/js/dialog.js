(function(root, factory) {
  'use strict';

  var moduleValue = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleValue;
  root.SelDevDialog = moduleValue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  /** Создаёт контроллер нативного диалога подтверждения. */
  function create(dialogElement) {
    var messageElement = dialogElement.querySelector('[data-dialog-message]');
    var yesButton = dialogElement.querySelector('[data-dialog-yes]');
    var noButton = dialogElement.querySelector('[data-dialog-no]');

    /** Закрывает диалог с выбранным булевым результатом. */
    function closeWith(value) {
      dialogElement.returnValue = value ? 'yes' : 'no';
      dialogElement.close();
    }

    yesButton.addEventListener('click', function() { closeWith(true); });
    noButton.addEventListener('click', function() { closeWith(false); });
    dialogElement.addEventListener('cancel', function(event) {
      event.preventDefault();
      closeWith(false);
    });

    /** Показывает вопрос и возвращает true только для кнопки «Да». */
    function confirm(message) {
      messageElement.textContent = message;
      dialogElement.showModal();
      return new Promise(function(resolve) {
        dialogElement.addEventListener('close', function() {
          resolve(dialogElement.returnValue === 'yes');
        }, { once: true });
      });
    }

    return { confirm: confirm };
  }

  return { create: create };
});
