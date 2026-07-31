# BDView

Виджет Grist Desktop строит таблицу устройств по категории, выбранной в `SYSTEM.selectedGroupID`.

Первые три постоянные колонки — `name`, `model`, `manufacturer` из таблицы `Devices`. После них добавляются колонки из `CategoryParameters` в порядке `manualSort`; строки включают устройства выбранной категории и всех её потомков. Значения загружаются одним чтением `DeviceParameters`, затем сопоставляются в памяти. Каждый столбец поддерживает сортировку и регистронезависимый поиск по части текста средствами Tabulator.

## Таблицы

- `SYSTEM`: `param`, `value`.
- `Categories`: `parent_id`.
- `CategoryParameters`: `category_id`, `parameter_id`, `manualSort`.
- `Parameters`: `name`, `unit`, `data_type`.
- `Devices`: `categories_id`, `name`, `model`, `manufacturer`.
- `DeviceParameters`: `device_id`, `parameter_id`, `value_float`, `value_int`, `value_string`.

Добавьте Custom Widget с URL `widget/BDView/index.html` и предоставьте доступ к документу. Виджет проверяет `SYSTEM` без перезагрузки страницы и полностью перестраивает Tabulator при смене категории.

## Тесты

```bash
node --test widget/BDView/tests/*.test.js
```
