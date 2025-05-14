from flask import Blueprint, request, jsonify, render_template, current_app
import traceback

error_bp = Blueprint('error', __name__)


@error_bp.route('/error')
def trigger_error():
    raise Exception("Simulated Page error")


@error_bp.route('/api/error')
def api_trigger_error():
    raise RuntimeError("Simulated API error")
