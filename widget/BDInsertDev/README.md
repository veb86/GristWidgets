# BD InsertDev

Виджет Grist Desktop для последовательного заполнения всех строк таблицы
`InsertDev`. Редактор выбирается по `type`, а атомарное действие
`UpdateRecord` сохраняет значение только в соответствующем `value_*` и
очищает остальные поля.

Если `parametr_column` содержит имя таблицы, кнопка «Выбрать» открывает все её
строки и колонки `name`, `parent_id`, `code`, `sort1`. В `InsertDev`
записывается `code`, а в основном списке показывается `name`. Источники и
`InsertDev` автоматически перечитываются раз в секунду, поэтому внешние
изменения появляются без перезагрузки виджета.

## Подключение

Добавьте Custom Widget с URL `http://localhost:8080/BDInsertDev/` и
предоставьте полный доступ к документу. Таблица `InsertDev` должна содержать
поля из задания issue #45.

## Проверка

```bash
node --test widget/BDInsertDev/tests/*.test.js
node --check widget/BDInsertDev/js/*.js
```
