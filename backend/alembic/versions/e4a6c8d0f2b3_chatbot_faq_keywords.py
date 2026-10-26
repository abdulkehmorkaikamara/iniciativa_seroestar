"""chatbot answers: keywords column and starting questions

Adds chatbot_faqs.keywords and, when the table is empty, the starting
question-and-answer list (English and Spanish) the website chat answers
from. The facts come from the academy's A1 welcome letter and the site;
the admin can edit them in the Admin Dashboard.

Revision ID: e4a6c8d0f2b3
Revises: d3f5b7c9e1a2
Create Date: 2026-10-26 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4a6c8d0f2b3"
down_revision: Union[str, Sequence[str], None] = "d3f5b7c9e1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

STARTING_FAQS = [
    ("en", "What levels do you teach?", "level, levels, learn, learning, beginner, a1, a2, b1, intermediate, elementary, start, zero",
     "We teach Spanish at three levels: A1 Beginner, A2 Elementary and B1 Intermediate. You can start from zero at A1. Not sure which level fits you? Message us on WhatsApp (+232 72 057646) and we'll help you choose."),
    ("en", "Are classes online or in person?", "online, physical, face, person, zoom, internet, power, virtual",
     "Classes are online. In Freetown we also have an interactive classroom for learners who prefer steady power and internet, and we can arrange face-to-face sessions when needed."),
    ("en", "When do classes take place?", "when, time, times, schedule, timetable, day, days, hour, hours, date, dates, week, weeks, long, duration, evening, saturday",
     "Our intensive courses last six weeks, with one-hour sessions on weekday evenings and Saturday mornings. Message us on WhatsApp (+232 72 057646) for the next start date and exact times."),
    ("en", "Do I get a certificate?", "certificate, certification, certified, diploma, embassy, attendance, proof",
     "Yes. Participants who attend at least 80% of the classes receive a certificate of participation from the Embassy of Spain in Guinea and Sierra Leone."),
    ("en", "How much does it cost?", "price, prices, cost, costs, much, fee, fees, pay, payment, money, free, leones, expensive, cheap",
     "Please message us on WhatsApp (+232 72 057646) for the current fees and free places, and we'll send you the details."),
    ("en", "How big are the groups?", "group, groups, size, students, participants, people, small, big, many",
     "Up to 16 participants per session, so everyone gets time to speak and practise."),
    ("en", "How do I sign up?", "register, registration, enrol, enroll, join, sign, apply, book, booking, contact, whatsapp, email, phone",
     "Press \"Book a free trial class\" on this website, or message us on WhatsApp at +232 72 057646, or email seroestar@icloud.com."),
    ("en", "Where are you based?", "where, location, address, based, office, country, freetown, sierra, leone, madrid, medellin, virginia",
     "We teach online from Freetown, Sierra Leone, and also have hubs in Madrid (Spain), Medellín (Colombia) and Virginia (USA)."),
    ("es", "¿Qué niveles enseñan?", "nivel, niveles, aprender, principiante, a1, a2, b1, intermedio, elemental, empezar, cero",
     "Enseñamos español en tres niveles: A1 Principiante, A2 Elemental y B1 Intermedio. Puedes empezar desde cero en A1. ¿No sabes qué nivel es el tuyo? Escríbenos por WhatsApp (+232 72 057646) y te ayudamos a elegir."),
    ("es", "¿Las clases son en línea o presenciales?", "online, linea, presencial, presenciales, persona, zoom, internet, luz, virtual",
     "Las clases son en línea. En Freetown también tenemos un aula interactiva para quienes prefieren electricidad e internet estables, y podemos organizar sesiones presenciales cuando haga falta."),
    ("es", "¿Cuándo son las clases?", "cuando, hora, horas, horario, horarios, dia, dias, fecha, fechas, semana, semanas, duracion, dura, tarde, sabado",
     "Nuestros cursos intensivos duran seis semanas, con sesiones de una hora entre semana por la tarde y los sábados por la mañana. Escríbenos por WhatsApp (+232 72 057646) para conocer la próxima fecha de inicio y los horarios exactos."),
    ("es", "¿Recibo un certificado?", "certificado, certificacion, diploma, embajada, asistencia, constancia",
     "Sí. Quienes asisten al menos al 80 % de las clases reciben un certificado de participación de la Embajada de España en Guinea y Sierra Leona."),
    ("es", "¿Cuánto cuesta?", "precio, precios, costo, coste, cuesta, cuota, pagar, pago, dinero, gratis, gratuito, leones, caro, barato",
     "Escríbenos por WhatsApp (+232 72 057646) para conocer las cuotas actuales y las plazas gratuitas, y te enviaremos los detalles."),
    ("es", "¿Cuántos estudiantes hay por grupo?", "grupo, grupos, tamano, estudiantes, alumnos, participantes, personas, pequeno, grande, cuantos",
     "Hasta 16 participantes por sesión, para que todos tengan tiempo de hablar y practicar."),
    ("es", "¿Cómo me inscribo?", "inscribir, inscribo, inscripcion, registro, registrar, unirme, apuntarme, reservar, contacto, whatsapp, correo, telefono",
     "Pulsa \"Reserva una clase de prueba gratuita\" en esta web, escríbenos por WhatsApp al +232 72 057646 o envía un correo a seroestar@icloud.com."),
    ("es", "¿Dónde están ubicados?", "donde, ubicacion, ubicados, direccion, oficina, pais, freetown, sierra, leona, madrid, medellin, virginia",
     "Enseñamos en línea desde Freetown, Sierra Leona, y también tenemos sedes en Madrid (España), Medellín (Colombia) y Virginia (EE. UU.)."),
]


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("chatbot_faqs")}
    if "keywords" not in columns:
        op.add_column("chatbot_faqs", sa.Column("keywords", sa.Text(), nullable=True))
    if bind.execute(sa.text("SELECT COUNT(*) FROM chatbot_faqs")).scalar() == 0:
        faqs = sa.table(
            "chatbot_faqs",
            sa.column("language", sa.String),
            sa.column("question", sa.String),
            sa.column("keywords", sa.Text),
            sa.column("answer", sa.Text),
        )
        op.bulk_insert(faqs, [
            {"language": lang, "question": question, "keywords": keywords, "answer": answer}
            for lang, question, keywords, answer in STARTING_FAQS
        ])


def downgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("chatbot_faqs")}
    if "keywords" in columns:
        with op.batch_alter_table("chatbot_faqs") as batch:
            batch.drop_column("keywords")
