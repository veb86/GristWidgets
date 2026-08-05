# SelDevices Manager

Компактный виджет Grist Desktop для управления всеми строками таблицы `SelDevices`.
Он показывает настроенные столбцы таблицы, сохраняет обычное редактирование через `UpdateRecord`,
изменяет `quantity` кнопками `+` и `-`, удаляет строки после подтверждения и очищает
таблицу одним `BulkRemoveRecord`.

## Подключение

Добавьте Custom Widget с URL `http://localhost:8080/SelDevManager/` и предоставьте
полный доступ к документу. Виджет всегда обращается к таблице `SelDevices` и использует
имя столбца `quantity` с учётом регистра (это текущий идентификатор в `SelDevices`).

Отображение задаётся строками таблицы `SelDevicesSet`: `namecol` содержит идентификатор
столбца `SelDevices`, `view` включает его отображение, `name` задаёт заголовок, а `sort` —
порядок. Системные столбцы `id` и `manualSort` не выводятся. Кнопка `X` всегда остаётся
первой, а кнопки `+` и `-` размещаются сразу после настроенного столбца `quantity`.

## Проверка

```bash
node --test widget/SelDevManager/tests/*.test.js
node --check widget/SelDevManager/js/*.js
```
