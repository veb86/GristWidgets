# Структура базы данных оборудования для CAD

## Правильная структура таблиц

### 1. Device (Устройства)

**Назначение:** Справочник устройств с базовой информацией

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | Integer | Уникальный ID | 1 |
| `name` | String | Наименование устройства | "Светильник потолочный LED" |
| `brand` | String | Модель/бренд | "LP-40-4000K" |
| `article` | String | Артикул производителя | "LED-40W" |
| `factoryname` | String | Производитель | "LightPro" |
| `unit` | String | Единица измерения | "шт" |
| `count` | Integer | Количество | 10 |
| `weight` | Float | Вес (кг) | 2.5 |
| `note` | String | Примечание | "Для офиса" |
| `devgroup_id` | Reference | Ссылка на Device_groups | 4 |
| `gristHelper_Display2` | String | Название группы (авто) | "Светильники" |

**Важно:** 
- `name` — это наименование устройства, а не характеристика
- Базовые свойства (unit, count, weight) хранятся здесь, а не в Device_characteristics

---

### 2. Device_groups (Группы устройств)

**Назначение:** Иерархическая классификация устройств

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | Integer | Уникальный ID | 4 |
| `parent_id` | Integer | ID родительской группы | 1 |
| `code` | String | Код группы | "luminaires" |
| `name` | String | Название | "Светильники" |

**Пример иерархии:**
```
0 (корень)
├── 1 (Светотехнические устройства)
│   ├── 4 (Светильники)
│   └── 5 (Лампы)
├── 2 (Аппараты защиты)
│   └── 6 (Автоматические выключатели)
└── 3 (Кабели)
```

---

### 3. Characteristics (Характеристики)

**Назначение:** Справочник типов характеристик

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | Integer | Уникальный ID | 3 |
| `group_id` | Reference | Группа характеристик | 2 |
| `code` | String | Код характеристики | "luminous_flux" |
| `name` | String | Название | "Световой поток" |
| `data_type` | String | **Тип данных** | "integer" |
| `unit` | String | Единица измерения | "лм" |
| `gristHelper_Display` | String | Название группы (авто) | "Светотехнические" |

**Важно:** Поле `data_type` определяет, из какого поля Device_characteristics брать значение!

**Значения data_type:**
- `"float"` — число с плавающей точкой (40.5)
- `"integer"` — целое число (4200)
- `"string"` — строка ("220В")
- `"bool"` или `"boolean"` — булево значение (true/false)

**Примеры характеристик:**

| id | code | name | data_type | unit |
|----|------|------|-----------|------|
| 1 | power | Мощность | float | Вт |
| 2 | voltage | Напряжение питания | string | В |
| 3 | luminous_flux | Световой поток | integer | лм |
| 4 | color_temperature | Температура | integer | К |
| 5 | rated_current | Номинальный ток | float | А |
| 6 | poles | Полюсность | integer | - |

---

### 4. Characteristic_groups (Группы характеристик)

**Назначение:** Классификация характеристик

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | Integer | Уникальный ID | 2 |
| `code` | String | Код группы | "lighting" |
| `name` | String | Название | "Светотехнические" |

---

### 5. Group_Characteristics (Связь групп устройств с характеристиками)

**Назначение:** Определение, какие характеристики отображать для каждой группы устройств

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | Integer | Уникальный ID | 3 |
| `group_id` | Reference | ID группы устройств | 4 |
| `characteristic_id` | Reference | ID характеристики | 3 |
| `is_visible` | Bool | Видимость столбца | true |
| `sort_order` | Integer | Порядок отображения | 2 |

**Пример настройки:**

Для группы "Светильники" (group_id=4):

| id | group_id | characteristic_id | is_visible | sort_order |
|----|----------|-------------------|------------|------------|
| 1 | 4 | 1 (Мощность) | true | 1 |
| 2 | 4 | 3 (Свет.поток) | true | 2 |

Для группы "Лампы" (group_id=5):

| id | group_id | characteristic_id | is_visible | sort_order |
|----|----------|-------------------|------------|------------|
| 5 | 5 | 1 (Мощность) | true | 1 |
| 6 | 5 | 3 (Свет.поток) | true | 2 |
| 7 | 5 | 4 (Температура) | true | 3 |

---

### 6. Device_characteristics (Значения характеристик устройств)

**Назначение:** Хранение значений характеристик для каждого устройства

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | Integer | Уникальный ID | 3 |
| `device_id` | Reference | ID устройства | 1 |
| `characteristic_id` | Reference | ID характеристики | 3 |
| `value_float` | Float | **Для float характеристик** | 40.5 |
| `value_int` | Integer | **Для integer характеристик** | 4200 |
| `value_string` | String | **Для string характеристик** | "220" |
| `value_bool` | Bool | **Для bool характеристик** | false |

**КРИТИЧЕСКИ ВАЖНО:**

Заполняйте **только одно поле** в зависимости от типа характеристики:

| data_type характеристики | Какое поле заполнять | Пример |
|--------------------------|---------------------|--------|
| `float` | `value_float` | 40.5 |
| `integer` | `value_int` | 4200 |
| `string` | `value_string` | "220" |
| `bool` | `value_bool` | true |

**НЕПРАВИЛЬНО:**
```csv
device_id=1, characteristic_id=3, value_float=0, value_int=4200, value_string=""
```

**ПРАВИЛЬНО:**
```csv
device_id=1, characteristic_id=3, value_int=4200
```

Остальные поля могут быть 0 или пустыми — они игнорируются при чтении.

---

### 7. Device_files (Файлы устройств)

**Назначение:** Прикреплённые файлы (фото, паспорта, схемы)

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | Integer | Уникальный ID | 1 |
| `device_id` | Reference | ID устройства | 1 |
| `file_type` | String | Тип файла | "image" |
| `role` | String | Роль | "photo" |
| `title` | String | Описание | "Фото светильника" |
| `file_path` | String | Путь к файлу | "./data/devices/1/photo.jpg" |
| `mime_type` | String | MIME-тип | "image/jpeg" |

---

### 8. SYSTEM (Системные параметры)

**Назначение:** Настройки виджета

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | Integer | Уникальный ID | 1 |
| `param` | String | Имя параметра | "selectedGroupID" |
| `value` | String | Значение | "4" |

---

## Пример заполнения для светильника

### Device
```csv
id,name,brand,factoryname,unit,count,devgroup_id
1,"Светильник LED LP-40-4000K","LP-40-4000K","LightPro",шт,10,4
```

### Characteristics (справочник)
```csv
id,code,name,data_type,unit
1,power,Мощность,float,Вт
3,luminous_flux,Световой поток,integer,лм
```

### Group_Characteristics (для группы 4)
```csv
group_id,characteristic_id,is_visible,sort_order
4,1,true,1
4,3,true,2
```

### Device_characteristics
```csv
device_id,characteristic_id,value_float,value_int,value_string
1,1,40,0,""
1,3,0,4200,""
```

**Обратите внимание:**
- Для мощности (data_type=float) заполнено `value_float=40`
- Для светового потока (data_type=integer) заполнено `value_int=4200`

---

## Альтернативная структура (более оптимальная)

Если вы хотите упростить структуру, можно использовать **единое поле значения**:

### Вариант A: Одно универсальное поле

```csv
Device_characteristics:
id,device_id,characteristic_id,value,data_type
1,1,1,"40","float"
2,1,3,"4200","integer"
3,1,2,"220","string"
```

**Преимущества:**
- Проще структура
- Не нужно проверять 4 поля
- Легче экспортировать

**Недостатки:**
- Все значения хранятся как строки
- Нужно преобразовывать типы при вычислениях

### Вариант B: JSON поле

```csv
Device_characteristics:
id,device_id,characteristic_id,value_json
1,1,1,"{"type":"float","value":40}"
2,1,3,"{"type":"integer","value":4200}"
```

**Преимущества:**
- Гибкая структура
- Можно хранить метаданные

**Недостатки:**
- Сложнее запросы
- Не все БД поддерживают JSON

---

## Рекомендации

### Для текущей структуры (4 поля value_*)

1. **Всегда заполняйте только одно поле** в соответствии с `data_type`
2. **Используйте 0 или пустую строку** для незаполненных полей
3. **Проверяйте `data_type`** перед чтением значения

### Для упрощения

Если планируете расширять систему, рассмотрите **Вариант A** с одним полем `value` текстового типа. Это упростит:
- Экспорт/импорт данных
- Написание запросов
- Поддержку кода

Но для числовых операций потребуется преобразование типов.

---

## Проверка правильности

### SQL-подобный запрос для проверки

```sql
SELECT 
  d.name AS device,
  c.name AS characteristic,
  c.data_type,
  CASE 
    WHEN c.data_type = 'float' THEN dc.value_float
    WHEN c.data_type = 'integer' THEN dc.value_int
    WHEN c.data_type = 'string' THEN dc.value_string
    WHEN c.data_type = 'bool' THEN dc.value_bool
  END AS value
FROM Device_characteristics dc
JOIN Device d ON dc.device_id = d.id
JOIN Characteristics c ON dc.characteristic_id = c.id
WHERE d.id = 1;
```

### Ожидаемый результат

| device | characteristic | data_type | value |
|--------|---------------|-----------|-------|
| Светильник LED LP-40-4000K | Мощность | float | 40 |
| Светильник LED LP-40-4000K | Световой поток | integer | 4200 |
| Светильник LED LP-40-4000K | Напряжение питания | string | 220 |
