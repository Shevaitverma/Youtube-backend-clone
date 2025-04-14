pipeline {
    agent {label 'server-agent'}

    environment {
        NVM_DIR = "${HOME}/.nvm"
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', credentialsId:'githubToken', url: 'https://github.com/Shevaitverma/Youtube-backend-clone.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                npm install
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                npm run build
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying to production folder...'
                sh '''
                # Stop existing process if running
                pm2 delete server || true

                # Start server with PM2
                pm2 start index.js --name "server" -- start

                # Save process list for startup
                pm2 save
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Deployed successfully!'
        }
        failure {
            echo '❌ Deployment failed. Check console output.'
        }
    }
}
