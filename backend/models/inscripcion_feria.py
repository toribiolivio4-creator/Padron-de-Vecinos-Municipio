from sqlalchemy import Column, BigInteger, ForeignKey, String
from sqlalchemy.orm import relationship
from backend.database import Base


class InscripcionFeria(Base):
    __tablename__ = "inscripciones_ferias"

    dni_persona = Column(String, ForeignKey("personas.dni"), primary_key=True)
    instagram_facebook = Column(String, nullable=False)
    rubro = Column(String, nullable=False)
    descripcion = Column(String, nullable=False)

    persona = relationship("Persona")
