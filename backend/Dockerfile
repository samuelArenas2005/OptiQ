# Imagen base optimizada de Python 3.11 (Slim para producción)
FROM python:3.11-slim

# Evitar generación de archivos .pyc y activar salida sin buffer para logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar o correr librerías numéricas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements para aprovechar el caché de capas de Docker
COPY requirements.txt /app/requirements.txt

# Instalar dependencias de Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copiar el código fuente del backend
COPY . /app

# Crear un usuario no-root por seguridad en producción
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Exponer el puerto de FastAPI
EXPOSE 8000

# Healthcheck para verificar el estado de salud de la API
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Comando de producción con Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
