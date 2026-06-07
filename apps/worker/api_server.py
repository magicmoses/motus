import os
import subprocess
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
TRIGGER_KEY = os.environ.get('PIPELINE_TRIGGER_KEY', 'dev-key')

@app.route('/trigger-pipeline', methods=['POST'])
def trigger_pipeline():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '').strip() if auth.startswith('Bearer ') else ''

    if token != TRIGGER_KEY:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        result = subprocess.run(
            ['python', 'run_pipeline.py'],
            cwd=os.path.dirname(__file__),
            capture_output=True,
            text=True,
            timeout=3600
        )
        return jsonify({
            'status': 'started',
            'returncode': result.returncode,
            'output': result.stdout[:500] if result.stdout else None,
        }), 200
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Pipeline timeout'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
