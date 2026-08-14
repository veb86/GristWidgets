# BDInsertUGO

Виджет Grist Desktop выводит таблицу `InsertUGO` как дерево и сохраняет выбранное
`ugo_dxf` в строку `SYSTEM`, где `param = "nameUGO"`.

## Таблицы

- `InsertUGO`: `name`, `parent_id`, `ugo_svg`, `ugo_dxf`, `sort1`, `sort2`;
- `SYSTEM`: `param` и столбец значения (предпочтительно `value`).

SVG-файлы размещаются в `widget/BDInsertUGO/svg`. Поле `ugo_svg` может содержать
имя с расширением `.svg` или без него. При изменениях исходных таблиц виджет
обновляет локальную модель автоматически.

`svg/demo_light.svg` служит только демонстрационным ресурсом для локальной проверки;
рабочие файлы должны называться в соответствии со значениями `InsertUGO.ugo_svg`.

## Проверка

```bash
node --test widget/BDInsertUGO/tests/*.test.js
node --check widget/BDInsertUGO/js/*.js
```
