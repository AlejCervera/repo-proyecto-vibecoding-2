from app.migrate import pending


def test_pending_ordena_y_salta_las_aplicadas(tmp_path):
    for nombre in ["002_b.sql", "001_a.sql", "003_c.sql", "notas.txt"]:
        (tmp_path / nombre).write_text("SELECT 1")
    result = [p.stem for p in pending({"002_b"}, tmp_path)]
    assert result == ["001_a", "003_c"]
