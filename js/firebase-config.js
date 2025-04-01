1. Manejo de Proyectos/Tandas Activos
En el primer código hay una lógica más clara para manejar un solo proyecto activo (usando limit(1)), 
mientras que en el segundo se muestran todos los proyectos sin distinguir cuál está activo.


4. Edición de Participantes
El primer código tiene esbozada una función editarParticipante() aunque no está completamente implementada.
El segundo código tiene botones de edición pero no hay lógica implementada para manejar la edición.

5. Progreso de Pagos
El primer código no tiene esta funcionalidad.
El segundo código muestra un progreso (64% completado) pero es estático, no calculado dinámicamente.

6. Filtrado y Ordenamiento
El primer código ordena explícitamente los participantes por número.
El segundo código también ordena pero podría beneficiarse de una implementación más robusta como 
la del primer código.