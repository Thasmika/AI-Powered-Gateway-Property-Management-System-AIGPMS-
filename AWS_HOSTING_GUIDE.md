# AWS Hosting Guide for AIGPMS

This guide is designed to help you understand how the AIGPMS application will be hosted on AWS and provides step-by-step instructions on how to get started, even if you have no prior experience with AWS.

---

## 1. Understanding Our AWS Architecture

Before we start clicking around, it helps to understand what parts of AWS we are going to use for the staging environment:

| Service | Purpose | Why we are using it |
| :--- | :--- | :--- |
| **AWS IAM** | Identity and Access Management | To generate secure "keys" so I (your AI assistant) can configure the hosting automatically from the terminal. |
| **AWS S3** | Simple Storage Service | We will use two S3 "buckets". One will host the **Frontend (React)** website. The other will securely store uploaded documents (like Title Deeds and Cheque Images). |
| **AWS EC2** | Elastic Compute Cloud | This is a virtual server in the cloud. We will run our **Backend (FastAPI)** code here. |
| **AWS RDS** | Relational Database Service | A managed database service. We will run **PostgreSQL** here to safely store all the real Property Master data your PM enters. |

---

## 2. Step-by-Step: Generating Your Access Keys

Because you only have an email and password, you need to log into the AWS Web Console to generate a special set of keys. These keys act as a username/password for automated scripts (like the ones I will run for you).

Follow these exact steps:

### Step A: Log In
1. Go to the [AWS Management Console](https://console.aws.amazon.com/).
2. Log in using the email and password your PM provided.

### Step B: Go to IAM
1. Once logged in, look at the search bar at the very top of the screen.
2. Type **IAM** and click on the first result (it stands for Identity and Access Management).

### Step C: Generate Keys
1. In the left-hand menu, click on **Users**.
2. Click on your username in the list.
3. Click on the **Security credentials** tab (located in the middle of the screen).
4. Scroll down to the **Access keys** section and click the **Create access key** button.
5. On the next screen, select **Command Line Interface (CLI)** as the use case. Check the confirmation box at the bottom and click **Next**.
6. You can skip adding a description tag and just click **Create access key**.

> [!CAUTION]
> **Important Security Step**
> The screen will now show an **Access key ID** and a **Secret access key**. 
> - **Do not close this page yet!** The Secret access key will never be shown again once you leave this page.
> - **Do not paste them directly into our chat here.** 

---

## 3. What to do next?

Once you are looking at the screen with your **Access key ID** and **Secret access key**:

1. Tell me in the chat: *"I have the keys ready."*
2. I will run a command in your terminal (`aws configure`).
3. You will click on your terminal window and paste the **Access Key ID** when it asks, press Enter, and then paste the **Secret Access Key** and press Enter.

Once that is done, I will take over and handle the rest of the complicated AWS setup (creating the database, setting up the server, and deploying the code) automatically!
