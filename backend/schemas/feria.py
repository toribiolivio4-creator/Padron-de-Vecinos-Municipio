from pydantic import Field
from backend.schemas.persona import PersonaBase


class FeriaCreate(PersonaBase):
    instagram_facebook: str = Field(
        ...,
        alias="pagina_redes",
        description="Usuario o URL de redes sociales (Instagram o Facebook)",
        example="@juan_artesanias",
    )
    rubro: str = Field(..., description="Rubro o categoría del puesto en la feria", example="Artesanías en cuero")
    descripcion: str = Field(
        ...,
        description="Descripción de los productos o servicios que ofrece",
        example="Venta de cintos, billeteras y accesorios de cuero artesanal.",
    )

    class Config:
        populate_by_name = True
