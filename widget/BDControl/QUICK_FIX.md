# Быстрая диагностика BDControl

## Проблема: Виджет ничего не отображает

### Решение 1: Проверьте данные в Grist

Откройте ваш Grist документ и проверьте:

1. **Таблица `SYSTEM`**: Есть ли запись с `param = 'selectedGroupID'`?
   - Если нет → создайте запись: `id=1, param='selectedGroupID', value='4'`

2. **Таблица `Group_Characteristics`**: Есть ли записи?
   - Должны быть записи для `group_id = 4` и `group_id = 5`

3. **Таблица `Characteristics`**: Есть ли характеристики?
   - Должны быть записи с `id=1,2,3,4`

4. **Таблица `Device_characteristics`**: Есть ли значения?
   - Должны быть записи для устройств из таблицы `Device`

### Решение 2: Отладка через браузер

1. Откройте страницу с виджетом в Grist
2. Нажмите **F12** (консоль разработчика)
3. Вкладка **Console**
4. Ищите ошибки красного цвета

### Решение 3: Запустите тест

1. Откройте в браузере: `minimal-test.html`
2. Скопируйте URL страницы Grist с виджетом
3. Вставьте URL в адресную строку браузера с заменой конца на `/widget/BDControl/minimal-test.html`

Пример:
```
Было: https://docs.getgrist.com/abc123/Page1
Стало: https://docs.getgrist.com/abc123/widget/BDControl/minimal-test.html
```

4. Смотрите результат теста в браузере

### Решение 4: Проверьте JSON маппинг виджета

В Grist нажмите на виджет → **Select Widget** → **Custom**

Проверьте что виджет привязан к таблице `SYSTEM`:

```
Table: SYSTEM
```

### Решение 5: Пересоздайте виджет

1. Удалите виджет со страницы
2. Добавьте новый виджет
3. Выберите **Custom Widget**
4. Введите URL: `https://pacoT7.github.io/GristWidgets/widget/BDControl/index.html`
   - Или локально: `http://localhost:8080/widget/BDControl/index.html`
5. Привяжите виджет к таблице `SYSTEM`

## Чек-лист

- [ ] Таблица `SYSTEM` существует и имеет запись `selectedGroupID`
- [ ] Таблица `Device_groups` существует и имеет группы с `id=4,5`
- [ ] Таблица `Device` существует и имеет устройства с `devgroup_id=4,5`
- [ ] Таблица `Group_Characteristics` существует и имеет записи
- [ ] Таблица `Characteristics` существует и имеет записи
- [ ] Таблица `Device_characteristics` существует и имеет записи
- [ ] Виджет привязан к таблице `SYSTEM`
- [ ] В консоли браузера нет ошибок

## Если ничего не помогло

1. Откройте `debug.html` в контексте Grist
2. Сделайте скриншот с данными
3. Скопируйте логи из консоли браузера (F12 → Console)
4. Проверьте данные таблиц в Grist

## Пример правильных данных

### SYSTEM
| id | param | value |
|----|-------|-------|
| 1 | selectedGroupID | 4 |

### Device_groups
| id | parent_id | code | name |
|----|-----------|------|------|
| 4 | 1 | luminaires | Светильники |
| 5 | 1 | lamps | Лампы |

### Group_Characteristics
| id | group_id | characteristic_id | is_visible | sort_order |
|----|----------|-------------------|------------|------------|
| 1 | 4 | 1 | true | 1 |
| 2 | 4 | 2 | true | 2 |
| 3 | 4 | 3 | true | 3 |
| 5 | 5 | 1 | true | 1 |
| 6 | 5 | 3 | true | 2 |

### Characteristics
| id | code | name | data_type | unit |
|----|------|------|-----------|------|
| 1 | power | Мощность | float | Вт |
| 2 | voltage | Напряжение питания | string | В |
| 3 | luminous_flux | Световой поток | integer | лм |
| 4 | color_temperature | Температура | integer | К |

### Device_characteristics
| id | device_id | characteristic_id | value_float | value_int | value_string |
|----|-----------|-------------------|-------------|-----------|--------------|
| 1 | 1 | 1 | 40 | | |
| 2 | 1 | 2 | | | 220 |
| 3 | 1 | 3 | | 4200 | |
