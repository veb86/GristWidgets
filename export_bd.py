import sys
import sqlite3
from pathlib import Path


OUTPUT_FILE = "database_schema.md"
SAMPLE_ROWS = 5


def get_existing_tables(cur):
    cur.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type='table'
        ORDER BY name
    """)

    return [row["name"] for row in cur.fetchall()]


def export_schema_to_markdown(db_path, table_names):

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    existing_tables = get_existing_tables(cur)

    md = []

    md.append("# SQLite Database Documentation")
    md.append("")

    md.append(f"## Database")
    md.append("")
    md.append(f"`{db_path}`")
    md.append("")

    md.append("## Tables found in database")
    md.append("")

    for table in existing_tables:
        md.append(f"- {table}")

    md.append("")

    for table_name in table_names:

        md.append(f"# Таблица `{table_name}`")
        md.append("")

        if table_name not in existing_tables:

            md.append("⚠ Таблица отсутствует в базе данных.")
            md.append("")
            md.append("---")
            md.append("")
            continue

        # --------------------------------------------------
        # CREATE TABLE
        # --------------------------------------------------

        cur.execute("""
            SELECT sql
            FROM sqlite_master
            WHERE type='table'
              AND name=?
        """, (table_name,))

        row = cur.fetchone()

        if row and row["sql"]:

            md.append("## CREATE TABLE")
            md.append("")
            md.append("```sql")
            md.append(row["sql"])
            md.append("```")
            md.append("")

        # --------------------------------------------------
        # Количество записей
        # --------------------------------------------------

        try:

            cur.execute(f'SELECT COUNT(*) cnt FROM "{table_name}"')
            count = cur.fetchone()["cnt"]

            md.append("## Статистика")
            md.append("")
            md.append(f"- Количество записей: **{count}**")
            md.append("")

        except Exception as ex:

            md.append("## Статистика")
            md.append("")
            md.append(f"- Ошибка: {ex}")
            md.append("")

        # --------------------------------------------------
        # Поля
        # --------------------------------------------------

        md.append("## Поля")
        md.append("")

        cur.execute(f'PRAGMA table_info("{table_name}")')

        columns = cur.fetchall()

        if columns:

            md.append("| Поле | Тип | NOT NULL | PK | DEFAULT |")
            md.append("|------|------|----------|----|----------|")

            for col in columns:

                md.append(
                    f"| {col['name']} "
                    f"| {col['type']} "
                    f"| {'Да' if col['notnull'] else 'Нет'} "
                    f"| {'Да' if col['pk'] else 'Нет'} "
                    f"| {col['dflt_value']} |"
                )

        md.append("")

        # --------------------------------------------------
        # Внешние ключи
        # --------------------------------------------------

        md.append("## Внешние ключи")
        md.append("")

        cur.execute(f'PRAGMA foreign_key_list("{table_name}")')

        fks = cur.fetchall()

        if fks:

            md.append("| Поле | Ссылка |")
            md.append("|------|---------|")

            for fk in fks:

                md.append(
                    f"| {fk['from']} "
                    f"| {fk['table']}.{fk['to']} |"
                )

        else:

            md.append("Нет внешних ключей")

        md.append("")

        # --------------------------------------------------
        # Индексы
        # --------------------------------------------------

        md.append("## Индексы")
        md.append("")

        cur.execute(f'PRAGMA index_list("{table_name}")')

        indexes = cur.fetchall()

        if indexes:

            md.append("| Имя индекса | UNIQUE | Поля |")
            md.append("|-------------|--------|------|")

            for idx in indexes:

                idx_name = idx["name"]

                cur.execute(
                    f'PRAGMA index_info("{idx_name}")'
                )

                cols = [c["name"] for c in cur.fetchall()]

                md.append(
                    f"| {idx_name} "
                    f"| {'Да' if idx['unique'] else 'Нет'} "
                    f"| {', '.join(cols)} |"
                )

        else:

            md.append("Нет индексов")

        md.append("")

        # --------------------------------------------------
        # Примеры данных
        # --------------------------------------------------

        md.append("## Примеры записей")
        md.append("")

        try:

            cur.execute(
                f'SELECT * FROM "{table_name}" LIMIT {SAMPLE_ROWS}'
            )

            rows = cur.fetchall()

            if rows:

                cols = rows[0].keys()

                md.append(
                    "|" + "|".join(cols) + "|"
                )

                md.append(
                    "|" + "|".join(["---"] * len(cols)) + "|"
                )

                for row in rows:

                    values = []

                    for col in cols:

                        value = row[col]

                        if value is None:
                            values.append("")
                        else:
                            value = str(value)

                            value = (
                                value
                                .replace("\n", " ")
                                .replace("|", "\\|")
                            )

                            if len(value) > 120:
                                value = value[:120] + "..."

                            values.append(value)

                    md.append(
                        "|" + "|".join(values) + "|"
                    )

            else:

                md.append("Таблица пустая")

        except Exception as ex:

            md.append(f"Ошибка чтения данных: {ex}")

        md.append("")
        md.append("---")
        md.append("")

    conn.close()

    Path(OUTPUT_FILE).write_text(
        "\n".join(md),
        encoding="utf-8"
    )

    print()
    print(f"Markdown сохранён: {OUTPUT_FILE}")


if __name__ == "__main__":

    if len(sys.argv) < 3:

        print()
        print("Использование:")
        print("export_schema.py <db_file> <table1> [table2] [table3] ...")
        print()
        sys.exit(1)

    db_file = sys.argv[1]
    tables = sys.argv[2:]

    print()
    print(f"Database: {db_file}")
    print(f"Tables: {' '.join(tables)}")

    try:

        export_schema_to_markdown(
            db_file,
            tables
        )

    except Exception as ex:

        print()
        print("Ошибка:")
        print(ex)
        sys.exit(1)