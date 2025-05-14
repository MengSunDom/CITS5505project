from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, DecimalField, SelectField, DateTimeLocalField
from wtforms.validators import DataRequired, EqualTo, Optional

class RegisterForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(), EqualTo('password', message='Passwords must match')
    ])

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')


class IncomeForm(FlaskForm):
    amount = DecimalField('Amount', places=2, validators=[DataRequired()])
    category = SelectField(
        'Category',
        choices=[
            ('Salary', 'Salary'),
            ('Bonus', 'Bonus'),
            ('Interest', 'Interest'),
            ('Transfer_family', 'Transfer_family'),
            ('Gift', 'Gift'),
            ('Other', 'Other')
        ],
        validators=[DataRequired()]
    )
    description = StringField('Description', validators=[Optional()])
    date = DateTimeLocalField('Date', format='%Y-%m-%dT%H:%M:%S', validators=[DataRequired()])

class ExpensesForm(FlaskForm):
    amount = DecimalField('Amount', places=2, validators=[DataRequired()])
    category = SelectField(
        'Category',
        choices=[
            ('Salary', 'Salary'),
            ('Bonus', 'Bonus'),
            ('Interest', 'Interest'),
            ('Transfer_family', 'Transfer_family'),
            ('Gift', 'Gift'),
            ('Other', 'Other')
        ],
        validators=[DataRequired()]
    )
    description = StringField('Description', validators=[Optional()])
    date = DateTimeLocalField('Date', format='%Y-%m-%dT%H:%M:%S', validators=[DataRequired()])