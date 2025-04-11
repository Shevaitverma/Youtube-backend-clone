pipeline {
    agent {label 'agent1'}

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
                export NVM_DIR="$HOME/.nvm"
                . "$NVM_DIR/nvm.sh"
                npm install
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                export NVM_DIR="$HOME/.nvm"
                . "$NVM_DIR/nvm.sh"
                npm run build
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying to production folder...'
                sh '''
                sudo rm -rf /var/www/html/*
                sudo cp -r dist/* /var/www/html/
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
