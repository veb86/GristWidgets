/**
 * Файл настроек для виджета OneLineSchema
 *
 * Этот файл определяет интерфейс настроек для виджета
 */

// Определяем настройки виджета
if (window.grist && grist.widget) {
  grist.widget.register({
    name: "OneLineSchema",
    description: "Визуализация однолинейных электрических схем",
    sections: ["single", "detail", "recordCard"],
    supportsManualResize: true,
    options: [
      {
        name: "layout",
        title: "Расположение",
        type: "string",
        defaultValue: "vertical",
        choices: ["vertical", "horizontal"]
      },
      {
        name: "groupByFeeder",
        title: "Группировать по фидерам",
        type: "boolean",
        defaultValue: true
      },
      {
        name: "scale",
        title: "Масштаб",
        type: "number",
        defaultValue: 1.0
      }
    ]
  });
}