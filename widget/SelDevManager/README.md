# SelDevices Manager

Компактный виджет Grist Desktop для управления всеми строками таблицы `SelDevices`.
Он показывает все столбцы таблицы, сохраняет обычное редактирование через `UpdateRecord`,
изменяет `quantity` кнопками `+` и `-`, удаляет строки после подтверждения и очищает
таблицу одним `BulkRemoveRecord`.

## Подключение

Добавьте Custom Widget с URL `http://localhost:8080/SelDevManager/` и предоставьте
полный доступ к документу. Виджет всегда обращается к таблице `SelDevices` и использует
имя столбца `quantity` с учётом регистра (это текущий идентификатор в `SelDevices`).

## Проверка

```bash
node --test widget/SelDevManager/tests/*.test.js
node --check widget/SelDevManager/js/*.js
```
